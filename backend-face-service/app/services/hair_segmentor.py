"""
Extract the user's existing hair region from the aligned face image.
Uses MediaPipe SelfieSegmentation + HSV hair-color refinement.
"""
from __future__ import annotations
import cv2
import numpy as np
import mediapipe as mp

mp_selfie = mp.solutions.selfie_segmentation


def segment_hair(bgr_image: np.ndarray) -> np.ndarray:
    """
    Returns a single-channel float mask (0–1) where 1 = hair region.
    """
    h, w = bgr_image.shape[:2]
    rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)

    # --- Selfie segmentation: isolate person from background
    with mp_selfie.SelfieSegmentation(model_selection=1) as seg:
        result = seg.process(rgb)
    person_mask = result.segmentation_mask  # float32 0-1

    # --- HSV-based hair color detection
    hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)

    ranges = [
        (np.array([0,   0,   0]),   np.array([180, 255,  70])),   # black/dark
        (np.array([0,  20,  70]),   np.array([20,  200, 200])),   # brown
        (np.array([15, 30, 100]),   np.array([35,  180, 255])),   # blonde
        (np.array([0,  50,  50]),   np.array([15,  255, 255])),   # red (low)
        (np.array([160,50,  50]),   np.array([180, 255, 255])),   # red (high)
    ]
    color_mask = np.zeros((h, w), dtype=np.uint8)
    for lo, hi in ranges:
        color_mask = cv2.bitwise_or(color_mask, cv2.inRange(hsv, lo, hi))

    # Keep only the TOP portion of the person silhouette (hair sits above eyes)
    top_region = np.zeros((h, w), dtype=np.uint8)
    top_cut = int(h * 0.55)
    top_region[:top_cut, :] = 255

    # Combine: hair = (person AND hair color) in top portion
    person_uint8 = (person_mask > 0.5).astype(np.uint8) * 255
    hair_mask = cv2.bitwise_and(color_mask, person_uint8)
    hair_mask = cv2.bitwise_and(hair_mask, top_region)

    # Morphological refinement
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    hair_mask = cv2.morphologyEx(hair_mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    hair_mask = cv2.morphologyEx(hair_mask, cv2.MORPH_DILATE, kernel, iterations=1)

    # Smooth edges
    hair_float = hair_mask.astype(np.float32) / 255.0
    hair_float = cv2.GaussianBlur(hair_float, (21, 21), 0)

    return hair_float
