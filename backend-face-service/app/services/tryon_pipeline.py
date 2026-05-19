"""
Orchestrates the full try-on pipeline with step logging.
"""
from __future__ import annotations
import cv2
import numpy as np
import io
from PIL import Image

from app.services.face_detector import detect_face_and_landmarks
from app.services.face_aligner import align_face, warp_back
from app.services.hair_segmentor import segment_hair
from app.services.hairstyle_overlay import overlay_hairstyle


def bytes_to_bgr(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Cannot decode image")
    return img


def bgr_to_png_bytes(img: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise ValueError("Cannot encode image")
    return buf.tobytes()


def run_tryon(
    face_image_bytes: bytes,
    hairstyle_image_path: str,
    hairstyle_mask_path: str | None,
    aligned_size: int = 512,
) -> bytes:
    print("[1/7] Decoding face image...")
    bgr = bytes_to_bgr(face_image_bytes)
    print(f"      Image shape: {bgr.shape}")

    print("[2/7] Detecting face landmarks...")
    face_data = detect_face_and_landmarks(bgr)
    if face_data is None:
        raise ValueError("No face detected in the image")
    print(f"      bbox={face_data.bbox}, left_eye={face_data.left_eye}, right_eye={face_data.right_eye}")

    print("[3/7] Aligning face...")
    aligned, M_inv = align_face(bgr, face_data, output_size=aligned_size)
    print(f"      Aligned shape: {aligned.shape}")

    print("[4/7] Segmenting existing hair...")
    hair_mask = segment_hair(aligned)
    print(f"      Hair mask coverage: {hair_mask.mean():.3f}")

    print(f"[5/7] Overlaying hairstyle from: {hairstyle_image_path}")
    composite_aligned = overlay_hairstyle(
        aligned_bgr=aligned,
        hair_mask=hair_mask,
        hairstyle_image_path=hairstyle_image_path,
        hairstyle_mask_path=hairstyle_mask_path,
    )
    print(f"      Composite shape: {composite_aligned.shape}")

    print("[6/7] Warping back to original space...")
    composite_original = warp_back(composite_aligned, M_inv, bgr.shape)

    hair_mask_orig = warp_back(
        (hair_mask * 255).astype(np.uint8), M_inv, bgr.shape
    ).astype(np.float32) / 255.0

    overlay_region = warp_back(
        np.ones((aligned_size, aligned_size), dtype=np.uint8) * 255,
        M_inv, bgr.shape,
    ).astype(np.float32) / 255.0

    blend_alpha = np.clip(hair_mask_orig + overlay_region * 0.4, 0, 1)
    blend_alpha = cv2.GaussianBlur(blend_alpha, (31, 31), 0)

    result = bgr.astype(np.float32).copy()
    comp   = composite_original.astype(np.float32)
    for c in range(3):
        result[:, :, c] = (
            comp[:, :, c] * blend_alpha +
            result[:, :, c] * (1.0 - blend_alpha)
        )
    result = np.clip(result, 0, 255).astype(np.uint8)

    print("[7/7] Encoding result PNG...")
    output = bgr_to_png_bytes(result)
    print(f"      Done. Output size: {len(output)} bytes")
    return output
