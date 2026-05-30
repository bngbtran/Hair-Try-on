import cv2
import numpy as np
from PIL import Image


def straighten_hair(hair_pil_img: Image.Image) -> Image.Image:

    img_arr = np.array(hair_pil_img)
    alpha = img_arr[:, :, 3]

    ys, xs = np.where(alpha > 30)

    if len(ys) == 0:
        return hair_pil_img

    ymin, ymax = ys.min(), ys.max()
    xmin, xmax = xs.min(), xs.max()

    bottom_threshold = ymin + int((ymax - ymin) * 0.75)

    bottom_ys, bottom_xs = np.where(
        (alpha > 30) & (np.arange(alpha.shape[0])[:, None] >= bottom_threshold)
    )

    if len(bottom_xs) < 10:
        return hair_pil_img

    slope, _ = np.polyfit(bottom_xs, bottom_ys, 1)

    angle_rad = np.arctan(slope)

    angle_to_rotate = float(np.degrees(angle_rad))

    if abs(angle_to_rotate) > 45:
        pts = np.column_stack((xs, ys)).astype(np.float32)

        _, eigenvectors, _ = cv2.PCACompute2(pts, mean=None)

        angle_to_rotate = (
            float(np.degrees(np.arctan2(eigenvectors[0, 1], eigenvectors[0, 0]))) - 90
        )

    if abs(angle_to_rotate) > 35:
        angle_to_rotate = 0

    if abs(angle_to_rotate) < 1.5:
        return hair_pil_img

    center = (int((xmin + xmax) / 2), int((ymin + ymax) / 2))

    return hair_pil_img.rotate(
        -angle_to_rotate, resample=Image.BICUBIC, center=center, expand=False
    )
