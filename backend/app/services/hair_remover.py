import io

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

from app.services.mediapipe_models import get_face_landmarker
from app.services.hair_segmenter import HairSegmenter

_segmenter = None


def get_segmenter():
    global _segmenter

    if _segmenter is None:
        _segmenter = HairSegmenter()

    return _segmenter


def _sample_skin_ref(img_rgb: np.ndarray, erase_mask: np.ndarray) -> np.ndarray:
    k_in = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    k_out = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (30, 30))
    outer = cv2.bitwise_and(
        cv2.dilate(erase_mask, k_out),
        cv2.bitwise_not(cv2.dilate(erase_mask, k_in)),
    )
    ys, xs = np.where(outer > 0)
    if len(ys) == 0:
        return np.array([210, 175, 150], dtype=np.float32)
    colors = img_rgb[ys, xs].astype(np.float32)
    bright = colors.mean(axis=1) > 80
    if bright.sum() < 5:
        return np.array([210, 175, 150], dtype=np.float32)
    return colors[bright].mean(axis=0)


def _make_ear_restore_mask(img_rgb: np.ndarray) -> np.ndarray:
    H, W = img_rgb.shape[:2]
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    face_landmarker = get_face_landmarker()
    result = face_landmarker.detect(mp_img)
    mask = np.zeros((H, W), np.uint8)
    if not result.face_landmarks:
        return mask

    lm = result.face_landmarks[0]
    lc_x = int(lm[234].x * W)
    lc_y = int(lm[234].y * H)
    rc_x = int(lm[454].x * W)
    rc_y = int(lm[454].y * H)

    fw = max(1, abs(rc_x - lc_x))
    er_w = int(fw * 0.10)
    er_h = int(fw * 0.19)
    off = int(er_w * 0.5)

    cv2.ellipse(mask, (lc_x - off, lc_y), (er_w, er_h), 0, 0, 360, 255, -1)
    cv2.ellipse(mask, (rc_x + off, rc_y), (er_w, er_h), 0, 0, 360, 255, -1)
    return mask


def remove_old_hair(person_pil: Image.Image) -> tuple:
    """
    Xoá tóc cũ khỏi ảnh người dùng.
    Return: (no_hair_pil RGBA, hair_mask ndarray H×W uint8)
    """
    img_rgb = np.array(person_pil.convert("RGB"))
    H, W = img_rgb.shape[:2]

    # Lấy hair mask từ HairSegmenter có sẵn
    buf = io.BytesIO()
    person_pil.convert("RGB").save(buf, format="PNG")
    segmenter = get_segmenter()
    hair_mask = segmenter.get_hair_mask(buf.getvalue())

    k_big = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    k_med = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))

    mask_dilate = cv2.dilate(hair_mask, k_big, iterations=3)

    # Bắt thêm sợi tóc tối ở rìa
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    dark = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 80]))
    dark = cv2.bitwise_and(dark, cv2.dilate(hair_mask, k_big, iterations=4))
    erase_mask = cv2.bitwise_or(mask_dilate, dark)

    # ── Pre-fill + Inpaint ────────────────────────────────────────────────────
    skin_ref = _sample_skin_ref(img_rgb, erase_mask)
    img_seeded = img_rgb.copy()
    eys, exs = np.where(erase_mask > 0)
    img_seeded[eys, exs] = skin_ref.astype(np.uint8)
    inpainted = cv2.inpaint(img_seeded, erase_mask, 21, cv2.INPAINT_TELEA)

    # ── Distance-weighted color correction ────────────────────────────────────
    dist = cv2.distanceTransform(erase_mask, cv2.DIST_L2, 5).astype(np.float32)
    d_max = dist.max()
    if d_max > 0 and len(eys) > 0:
        dist_norm = (dist / d_max) ** 0.6
        inp_mean = inpainted[eys, exs].astype(np.float32).mean(axis=0)
        color_delta = (skin_ref - inp_mean) * 0.45
        offset_map = dist_norm[:, :, None] * color_delta[None, None, :]
        inpainted_f = inpainted.astype(np.float32)
        inpainted_f[eys, exs] = (inpainted_f[eys, exs] + offset_map[eys, exs]).clip(
            0, 255
        )
        inpainted = inpainted_f.astype(np.uint8)

        smoothed = cv2.GaussianBlur(inpainted, (11, 11), 0)
        sw = (dist_norm * 0.35)[:, :, None]
        inpainted_f = inpainted.astype(np.float32)
        inpainted_f[eys, exs] = (
            inpainted_f[eys, exs] * (1 - sw[eys, exs])
            + smoothed.astype(np.float32)[eys, exs] * sw[eys, exs]
        ).clip(0, 255)
        inpainted = inpainted_f.astype(np.uint8)

    # ── Pass-2 cleanup ────────────────────────────────────────────────────────
    edge_band = cv2.dilate(hair_mask, k_big, iterations=4)
    hsv2 = cv2.cvtColor(inpainted, cv2.COLOR_RGB2HSV)
    dark2 = cv2.inRange(hsv2, np.array([0, 0, 0]), np.array([180, 255, 90]))
    residual = cv2.bitwise_and(dark2, edge_band)
    if residual.sum() > 0:
        residual = cv2.dilate(residual, k_med, iterations=1)
        inpainted = cv2.inpaint(inpainted, residual, 15, cv2.INPAINT_TELEA)

    # ── Restore tai từ ảnh gốc (feather 7px) ─────────────────────────────────
    ear_restore = _make_ear_restore_mask(img_rgb)
    if ear_restore.any():
        ear_alpha = cv2.GaussianBlur(ear_restore.astype(np.float32), (7, 7), 0) / 255.0
        inpainted = (
            (
                inpainted.astype(np.float32) * (1 - ear_alpha[:, :, None])
                + img_rgb.astype(np.float32) * ear_alpha[:, :, None]
            )
            .clip(0, 255)
            .astype(np.uint8)
        )

    # ── Feather blend 11px tại biên tóc cũ ───────────────────────────────────
    blur_mask = cv2.GaussianBlur(erase_mask.astype(np.float32), (11, 11), 0) / 255.0
    result_rgb = (
        (
            inpainted.astype(np.float32) * blur_mask[:, :, None]
            + img_rgb.astype(np.float32) * (1 - blur_mask[:, :, None])
        )
        .clip(0, 255)
        .astype(np.uint8)
    )

    rgba = np.dstack([result_rgb, np.full((H, W), 255, np.uint8)])
    result_pil = Image.fromarray(rgba, "RGBA")

    return result_pil, hair_mask
