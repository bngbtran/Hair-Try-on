"""
Face detection and landmark extraction using MediaPipe FaceMesh.
Returns normalized (0-1) and pixel landmarks for a 478-point mesh.
"""
from __future__ import annotations
import cv2
import numpy as np
import mediapipe as mp
from dataclasses import dataclass
from typing import Optional

mp_face_mesh = mp.solutions.face_mesh

LEFT_EYE_IDX  = [33, 133]
RIGHT_EYE_IDX = [362, 263]
NOSE_TIP_IDX  = 1


@dataclass
class FaceData:
    bbox: tuple[int, int, int, int]
    landmarks_norm: np.ndarray
    landmarks_px: np.ndarray
    left_eye: np.ndarray
    right_eye: np.ndarray
    nose_tip: np.ndarray
    image_shape: tuple[int, int]


def detect_face_and_landmarks(bgr_image: np.ndarray) -> Optional[FaceData]:
    h, w = bgr_image.shape[:2]
    rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as mesh:
        result = mesh.process(rgb)

    if not result.multi_face_landmarks:
        return None

    face_lm = result.multi_face_landmarks[0]
    lm_norm = np.array([[p.x, p.y, p.z] for p in face_lm.landmark], dtype=np.float32)
    lm_px   = (lm_norm[:, :2] * np.array([w, h])).astype(np.int32)

    x_min, y_min = lm_px.min(axis=0)
    x_max, y_max = lm_px.max(axis=0)
    bbox = (int(x_min), int(y_min), int(x_max - x_min), int(y_max - y_min))

    left_eye  = lm_px[LEFT_EYE_IDX].mean(axis=0).astype(np.float32)
    right_eye = lm_px[RIGHT_EYE_IDX].mean(axis=0).astype(np.float32)
    nose_tip  = lm_px[NOSE_TIP_IDX].astype(np.float32)

    return FaceData(
        bbox=bbox,
        landmarks_norm=lm_norm,
        landmarks_px=lm_px,
        left_eye=left_eye,
        right_eye=right_eye,
        nose_tip=nose_tip,
        image_shape=(h, w),
    )


def bytes_to_bgr_safe(data: bytes) -> Optional[np.ndarray]:
    arr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)
