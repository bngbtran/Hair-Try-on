"""
Blend the chosen hairstyle onto the aligned face image, then warp back
to the original image dimensions.

Pipeline:
  1. Remove existing hair via inverted hair mask
  2. Scale + position hairstyle image to cover the head region
  3. Alpha-blend hairstyle onto face
  4. Warp composite back to original image space
"""
from __future__ import annotations
import cv2
import numpy as np
from PIL import Image
import io


def _load_rgba(path: str) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    return np.array(img, dtype=np.uint8)


def _rgba_to_bgra(rgba: np.ndarray) -> np.ndarray:
    return rgba[:, :, [2, 1, 0, 3]]


def overlay_hairstyle(
    aligned_bgr: np.ndarray,
    hair_mask: np.ndarray,          # float 0-1, same HxW as aligned_bgr
    hairstyle_image_path: str,
    hairstyle_mask_path: str | None,
    face_top_ratio: float = 0.08,   # hairstyle top edge aligns here
    face_width_ratio: float = 1.15, # hairstyle scales to this fraction of frame width
) -> np.ndarray:
    """
    Returns a BGR image (same size as aligned_bgr) with the hairstyle applied.
    """
    h, w = aligned_bgr.shape[:2]

    # ── Load hairstyle ────────────────────────────────────────────────────────
    hair_rgba = _load_rgba(hairstyle_image_path)
    hair_bgra = _rgba_to_bgra(hair_rgba)

    # Resize hairstyle to target width
    target_w = int(w * face_width_ratio)
    scale = target_w / hair_bgra.shape[1]
    target_h = int(hair_bgra.shape[0] * scale)
    hair_bgra = cv2.resize(hair_bgra, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    # ── Build hairstyle alpha mask ────────────────────────────────────────────
    if hair_bgra.shape[2] == 4:
        hair_alpha = hair_bgra[:, :, 3].astype(np.float32) / 255.0
    else:
        hair_alpha = np.ones((target_h, target_w), dtype=np.float32)

    if hairstyle_mask_path:
        ext_mask = cv2.imread(hairstyle_mask_path, cv2.IMREAD_GRAYSCALE)
        if ext_mask is not None:
            ext_mask = cv2.resize(ext_mask, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
            ext_alpha = ext_mask.astype(np.float32) / 255.0
            hair_alpha = np.minimum(hair_alpha, ext_alpha)

    hair_alpha = cv2.GaussianBlur(hair_alpha, (7, 7), 0)

    # ── Remove user's existing hair ───────────────────────────────────────────
    inv_hair = 1.0 - hair_mask
    base = aligned_bgr.astype(np.float32).copy()
    for c in range(3):
        base[:, :, c] *= inv_hair

    # ── Paste hairstyle ───────────────────────────────────────────────────────
    # Position: centre horizontally, align top
    x_offset = (w - target_w) // 2
    y_offset = int(h * face_top_ratio)

    canvas = base.copy()
    hair_bgr = hair_bgra[:, :, :3].astype(np.float32)

    # Determine overlap region on canvas
    y0c = max(y_offset, 0)
    y1c = min(y_offset + target_h, h)
    x0c = max(x_offset, 0)
    x1c = min(x_offset + target_w, w)

    # Corresponding slice in hairstyle
    y0h = y0c - y_offset
    y1h = y0h + (y1c - y0c)
    x0h = x0c - x_offset
    x1h = x0h + (x1c - x0c)

    if y1c > y0c and x1c > x0c:
        alpha_patch = hair_alpha[y0h:y1h, x0h:x1h, np.newaxis]
        hair_patch  = hair_bgr[y0h:y1h, x0h:x1h]
        canvas_patch = canvas[y0c:y1c, x0c:x1c]
        canvas[y0c:y1c, x0c:x1c] = (
            hair_patch * alpha_patch + canvas_patch * (1.0 - alpha_patch)
        )

    return np.clip(canvas, 0, 255).astype(np.uint8)
