import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

from app.services.mediapipe_models import get_face_landmarker


def _lm_pt(lm, idx: int, W: int, H: int) -> np.ndarray:
    return np.array([lm[idx].x * W, lm[idx].y * H], dtype=np.float64)


def _face_geometry(img_rgb: np.ndarray) -> dict | None:
    H, W = img_rgb.shape[:2]

    mp_img = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=img_rgb,
    )

    result = get_face_landmarker().detect(mp_img)

    if not result.face_landmarks:
        return None

    lm = result.face_landmarks[0]

    def pt(idx):
        return _lm_pt(lm, idx, W, H)

    left_cheek = pt(234)
    right_cheek = pt(454)
    face_width = float(np.linalg.norm(pt(356) - pt(127)))
    cheek_width = float(np.linalg.norm(right_cheek - left_cheek))

    temple_left = pt(21)
    temple_right = pt(251)

    le = np.array([pt(i) for i in [33, 133, 159, 145]]).mean(0)
    re = np.array([pt(i) for i in [362, 263, 386, 374]]).mean(0)
    ec = (le + re) * 0.5
    ev = re - le
    ang = float(np.degrees(np.arctan2(ev[1], ev[0])))

    left_brow_y = np.array([pt(i)[1] for i in [70, 63, 105, 66, 107]]).mean()
    right_brow_y = np.array([pt(i)[1] for i in [336, 296, 334, 293, 300]]).mean()
    brow_y = float((left_brow_y + right_brow_y) * 0.5)
    nose_tip_y = float(pt(4)[1])
    hairline_pt = np.array([ec[0], 2.0 * brow_y - nose_tip_y], dtype=np.float64)
    lm10 = pt(10)

    def _px(idx):
        py = int(np.clip(pt(idx)[1], 5, H - 5))
        px = int(np.clip(pt(idx)[0], 5, W - 5))
        return img_rgb[py, px, :3]

    skin_color = np.median([_px(4), _px(1), _px(168)], axis=0).astype(np.uint8)
    nose_x = float(pt(4)[0])
    yaw_ratio = abs(nose_x - left_cheek[0]) / max(1.0, abs(right_cheek[0] - nose_x))

    return dict(
        lm=lm,
        W=W,
        H=H,
        face_width=face_width,
        cheek_width=cheek_width,
        temple_left=temple_left,
        temple_right=temple_right,
        angle_deg=ang,
        eye_center=ec,
        brow_y=brow_y,
        nose_tip_y=nose_tip_y,
        hairline_pt=hairline_pt,
        skin_color=skin_color,
        yaw_ratio=yaw_ratio,
        left_cheek=left_cheek,
        right_cheek=right_cheek,
        lm10=lm10,
    )


def _mask_geometry(hair_mask: np.ndarray, geo: dict):
    H, W = hair_mask.shape
    lx = max(0, int(geo["left_cheek"][0]))
    rx = min(W - 1, int(geo["right_cheek"][0]))
    brow_int = int(geo["brow_y"])

    root_y = None
    for row in range(brow_int, -1, -1):
        if float((hair_mask[row, lx:rx] > 0).sum()) / max(rx - lx, 1) >= 0.05:
            root_y = row
            break

    if root_y is None:
        for row in range(brow_int, -1, -1):
            if float((hair_mask[row] > 0).sum()) / max(W, 1) >= 0.03:
                root_y = row
                break

    oys, oxs = np.where(hair_mask > 0)
    if root_y is None or len(oxs) < 20:
        return None, None, None, None, None

    mask_left = float(oxs.min())
    mask_right = float(oxs.max())
    mask_cx = (mask_left + mask_right) / 2.0
    mask_width = mask_right - mask_left
    mask_top = float(oys.min())
    mask_height = max(1.0, float(root_y) - mask_top)

    return float(root_y), mask_cx, mask_width, mask_top, mask_height


def _build_hairline_alpha(
    geo: dict, H: int, W: int, feather_below: int = 12, hairline_y: float = None
) -> np.ndarray:
    lm = geo["lm"]
    lW = geo["W"]
    lH = geo["H"]

    def pt(i):
        return np.array([lm[i].x * lW, lm[i].y * lH])

    indices = [10, 109, 67, 103, 54, 21, 162, 338, 297, 332, 284, 251, 389]
    pts = np.array([pt(i) for i in indices])
    pts = pts[np.argsort(pts[:, 0])]
    coeffs = np.polyfit(pts[:, 0], pts[:, 1], 2)
    xs = np.arange(W, dtype=np.float32)
    hl_y = np.polyval(coeffs, xs)

    if hairline_y is not None:
        center_x = float(geo["eye_center"][0])
        lm_y_at_center = float(np.polyval(coeffs, center_x))
        hl_y = hl_y + (hairline_y - lm_y_at_center)

    y_grid = np.arange(H, dtype=np.float32)[:, None]
    dist = hl_y[None, :] - y_grid
    alpha = np.where(
        dist >= 0,
        np.ones_like(dist),
        np.clip(1.0 + dist / float(feather_below), 0.0, 1.0),
    ).astype(np.float32)

    tx_l = float(geo["temple_left"][0])
    tx_r = float(geo["temple_right"][0])
    fade_w = float(tx_r - tx_l) * 0.12
    weight = np.ones(W, dtype=np.float32)
    for x in range(W):
        if x < tx_l:
            weight[x] = max(0.0, (x - (tx_l - fade_w)) / fade_w) if fade_w > 0 else 0.0
        elif x > tx_r:
            weight[x] = max(0.0, ((tx_r + fade_w) - x) / fade_w) if fade_w > 0 else 0.0

    alpha = alpha * weight[None, :] + 1.0 * (1.0 - weight[None, :])
    return alpha.astype(np.float32)


def _refine_root_y(
    img_rgb: np.ndarray, approx_y: int, cx: int, search_radius: int = 30
) -> int:
    H, W = img_rgb.shape[:2]
    half_w = W // 5
    x0 = max(0, cx - half_w)
    x1 = min(W, cx + half_w)
    y0 = max(1, approx_y - search_radius)
    y1 = min(H, approx_y + search_radius)
    strip = img_rgb[y0:y1, x0:x1]
    gray = cv2.cvtColor(strip, cv2.COLOR_RGB2GRAY).astype(np.float32)
    row_grad = np.abs(np.diff(gray, axis=0)).mean(axis=1)
    if len(row_grad) == 0:
        return approx_y
    return y0 + int(np.argmax(row_grad))


def _face_anchored_placement(
    geo: dict, hair_rgba: np.ndarray, hair_mask: np.ndarray, img_rgb: np.ndarray
):
    lm10 = geo["lm10"]
    face_width = geo["face_width"]
    angle_deg = geo["angle_deg"]
    alpha = hair_rgba[:, :, 3]
    ys_h, xs_h = np.where(alpha > 10)

    if len(ys_h) == 0:
        hp = geo["hairline_pt"]
        h_h, w_h = hair_rgba.shape[:2]
        return (
            float(hp[0]),
            float(hp[1]),
            w_h // 2,
            h_h // 2,
            1.0,
            angle_deg,
            float(hp[1]),
        )

    bbox_w = float(xs_h.max() - xs_h.min())
    hair_top_r = float(ys_h.min())
    h_h, w_h = hair_rgba.shape[:2]

    brow_y = geo["brow_y"]
    lm10_y = lm10[1]
    mask_root_y, mask_cx, mask_width, mask_top, mask_height = _mask_geometry(
        hair_mask, geo
    )

    is_fringe = (
        (mask_top - lm10_y) > (brow_y - lm10_y) * 0.2
        if mask_root_y is not None
        else False
    )

    if mask_root_y is not None:
        if is_fringe:
            target_y = float(mask_top)
        else:
            target_y = float(_refine_root_y(img_rgb, int(mask_root_y), int(mask_cx)))
        target_x = float(mask_cx)
        scale_w = mask_width / max(bbox_w, 1.0)
        hair_alpha_height = max(1.0, float(np.where(alpha > 10)[0].max()) - hair_top_r)
        scale_h = mask_height / hair_alpha_height
        scale = float(np.clip(max(scale_w, scale_h), 0.3, 2.5))
    else:
        hp = geo["hairline_pt"]
        target_y = float(hp[1])
        target_x = float(hp[0])
        scale = float(np.clip(face_width / max(bbox_w, 1.0), 0.3, 2.5))

    cy_hair = int(ys_h.max())
    for row in range(h_h - 1, -1, -1):
        if float((alpha[row] > 10).sum()) / max(w_h, 1) >= 0.15:
            cy_hair = row
            break

    skew = np.clip((geo["yaw_ratio"] - 1.0) * 0.12, -0.06, 0.06)
    cx_hair = int(float(xs_h.min()) + bbox_w * (0.5 + skew))

    return target_x, target_y, cx_hair, cy_hair, scale, angle_deg, target_y


def _similarity_matrix(src, dst, scale: float, angle_deg: float) -> np.ndarray:
    theta = np.radians(angle_deg)
    c, s = np.cos(theta), np.sin(theta)
    ax, ay = float(src[0]), float(src[1])
    dx, dy = float(dst[0]), float(dst[1])
    return np.float32(
        [
            [scale * c, -scale * s, -scale * c * ax + scale * s * ay + dx],
            [scale * s, scale * c, -scale * s * ax - scale * c * ay + dy],
        ]
    )


def _composite(base: np.ndarray, warped: np.ndarray) -> np.ndarray:
    if base.shape[2] == 3:
        base = np.dstack([base, np.full(base.shape[:2], 255, np.uint8)])
    a = warped[:, :, 3:4].astype(np.float32) / 255.0
    comp = (
        base[:, :, :3].astype(np.float32) * (1 - a)
        + warped[:, :, :3].astype(np.float32) * a
    )
    return np.dstack([comp.astype(np.uint8), np.full(base.shape[:2], 255, np.uint8)])


def _blend_hairline(
    warped: np.ndarray, base: np.ndarray, comp: np.ndarray, geo: dict
) -> np.ndarray:
    H, W = comp.shape[:2]
    ha = warped[:, :, 3].astype(np.float32)
    edge = cv2.morphologyEx(
        (ha > 5).astype(np.uint8) * 255,
        cv2.MORPH_GRADIENT,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
    )

    tx_l = int(geo["temple_left"][0])
    tx_r = int(geo["temple_right"][0])
    y_start = max(0, int(geo["brow_y"] - geo["face_width"] * 0.25))
    zone = np.zeros((H, W), np.uint8)
    zone[y_start:, tx_l:tx_r] = 255

    ec = cv2.bitwise_and(edge, zone)
    f = cv2.GaussianBlur(ec, (11, 11), 0).astype(np.float32) / 255.0
    a = ha[:, :, None] / 255.0
    blended = warped[:, :, :3].astype(np.float32) * a + base[:, :, :3].astype(
        np.float32
    ) * (1 - a)
    out = (
        comp[:, :, :3].astype(np.float32) * (1 - f[:, :, None])
        + blended * f[:, :, None]
    )
    shad = cv2.GaussianBlur(ec, (11, 11), 0).astype(np.float32) / 255.0
    out = (out * (1 - shad[:, :, None] * 0.04)).clip(0, 255).astype(np.uint8)
    return np.dstack([out, np.full((H, W), 255, np.uint8)])


def overlay_hair(
    person_pil: Image.Image,
    no_hair_pil: Image.Image,
    hair_mask: np.ndarray,
    hair_pil: Image.Image,
) -> Image.Image:
    H, W = hair_mask.shape
    img_rgb = np.array(person_pil.convert("RGB"))

    geo = _face_geometry(img_rgb)
    if geo is None:
        raise RuntimeError("Không phát hiện khuôn mặt trong ảnh")

    hair_rgba = np.array(hair_pil.convert("RGBA"))
    ys, xs = np.where(hair_rgba[:, :, 3] > 5)
    if len(ys):
        hair_rgba = hair_rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]

    target_x, target_y, cx_hair, cy_hair, scale, angle_deg, hairline_y = (
        _face_anchored_placement(geo, hair_rgba, hair_mask, img_rgb)
    )

    target_hl = np.array([target_x, target_y], dtype=np.float32)
    hl_alpha = _build_hairline_alpha(geo, H, W, feather_below=12, hairline_y=hairline_y)

    M = _similarity_matrix(
        src=(cx_hair, cy_hair), dst=target_hl, scale=scale, angle_deg=angle_deg
    )
    wa = cv2.warpAffine(
        hair_rgba[:, :, :3],
        M,
        (W, H),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    walpha_raw = cv2.warpAffine(
        hair_rgba[:, :, 3],
        M,
        (W, H),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )
    walpha_raw = np.clip(
        (walpha_raw.astype(np.float32) / 255.0) ** 0.95 * 255.0, 0, 255
    ).astype(np.uint8)
    walpha = (walpha_raw.astype(np.float32) * hl_alpha).clip(0, 255).astype(np.uint8)
    warped = np.dstack([wa, walpha])

    base_rgb = np.array(no_hair_pil.convert("RGB"))
    H2, W2 = base_rgb.shape[:2]
    base_rgba = np.dstack([base_rgb, np.full((H2, W2), 255, np.uint8)])

    comp = _composite(base_rgba, warped)
    final = _blend_hairline(warped, base_rgba, comp, geo)
    return Image.fromarray(final, "RGBA")
