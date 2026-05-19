"""
Align face so that eyes are horizontal. Returns the aligned image and the
inverse transform so we can warp results back to the original frame.
"""
from __future__ import annotations
import cv2
import numpy as np
from app.services.face_detector import FaceData


def align_face(bgr_image: np.ndarray, face: FaceData, output_size: int = 512) -> tuple[np.ndarray, np.ndarray]:
    """
    Returns (aligned_image, M_inv) where M_inv maps aligned → original coords.
    """
    left_eye  = face.left_eye
    right_eye = face.right_eye

    # Eye centre and angle
    eye_center = ((left_eye + right_eye) / 2.0).astype(np.float32)
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = float(np.degrees(np.arctan2(dy, dx)))

    # Desired eye distance as fraction of output size
    desired_eye_dist = 0.4 * output_size
    scale = desired_eye_dist / (np.linalg.norm(right_eye - left_eye) + 1e-6)

    M = cv2.getRotationMatrix2D(tuple(eye_center), angle, scale)

    # Shift so eye centre lands at (0.5, 0.4) of the output
    M[0, 2] += output_size * 0.5 - eye_center[0]
    M[1, 2] += output_size * 0.4 - eye_center[1]

    aligned = cv2.warpAffine(bgr_image, M, (output_size, output_size), flags=cv2.INTER_LINEAR)

    # Inverse (3×3 form)
    M3 = np.vstack([M, [0, 0, 1]])
    M_inv = np.linalg.inv(M3)[:2]

    return aligned, M_inv


def warp_back(patch: np.ndarray, M_inv: np.ndarray, original_shape: tuple[int, int]) -> np.ndarray:
    h, w = original_shape[:2]
    return cv2.warpAffine(patch, M_inv, (w, h), flags=cv2.INTER_LINEAR)
