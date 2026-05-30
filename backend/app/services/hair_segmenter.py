import io
import os
import urllib.request

import cv2
import mediapipe as mp
import numpy as np

from PIL import Image

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


MODEL_PATH = "hair_segmenter.tflite"

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite"
)


if not os.path.exists(MODEL_PATH):
    print("Downloading Hair Segmenter Model...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Done.")


class HairSegmenter:
    T_CORE = 0.50
    T_STRAND = 0.20

    def __init__(self, model_path=MODEL_PATH):

        options = vision.ImageSegmenterOptions(
            base_options=python.BaseOptions(model_asset_path=model_path),
            output_confidence_masks=True,
        )

        self.segmenter = vision.ImageSegmenter.create_from_options(options)

        print("HairSegmenter Loaded")

    def _run_model(self, image_bytes):

        img_rgb = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))

        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        result = self.segmenter.segment(mp_img)

        conf = np.squeeze(
            np.array(result.confidence_masks[1].numpy_view(), dtype=np.float32)
        )

        return img_rgb, conf

    def _make_core(self, conf):

        raw = (conf > self.T_CORE).astype(np.uint8) * 255

        k9 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))

        mask = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k9, iterations=2)

        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k9)

        return mask

    def _make_strands(self, conf, core):

        raw = (conf > self.T_STRAND).astype(np.uint8) * 255

        k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

        raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k3)

        combined = cv2.bitwise_or(raw, core)

        _, labels = cv2.connectedComponents(combined)

        core_labels = set(int(v) for v in np.unique(labels[core > 0]) if v != 0)

        keep = np.zeros_like(raw)

        for lbl in core_labels:
            keep[labels == lbl] = 255

        strands = cv2.bitwise_and(keep, raw)

        strands = cv2.bitwise_and(strands, cv2.bitwise_not(core))

        return strands

    def _soft_alpha(self, conf, binary):

        gamma = 0.65

        soft = np.clip(conf.astype(np.float32) ** gamma, 0, 1) * 255

        alpha = np.where(binary > 0, soft, 0).astype(np.uint8)

        alpha = np.maximum(alpha, (conf > 0.8).astype(np.uint8) * 255)

        return alpha

    def get_hair_mask(self, image_bytes):

        _, conf = self._run_model(image_bytes)

        core = self._make_core(conf)

        strands = self._make_strands(conf, core)

        return cv2.bitwise_or(core, strands)

    def get_hair_rgba(self, image_bytes):

        img_rgb, conf = self._run_model(image_bytes)

        core = self._make_core(conf)

        strands = self._make_strands(conf, core)

        binary = cv2.bitwise_or(core, strands)

        alpha = self._soft_alpha(conf, binary)

        rgba = np.dstack([img_rgb, alpha]).astype(np.uint8)

        buffer = io.BytesIO()

        Image.fromarray(rgba, "RGBA").save(buffer, format="PNG")

        return buffer.getvalue()

    def remove_hair_region(self, image_bytes):
        return self.get_hair_rgba(image_bytes)

    def visualize(self, image_bytes, save_path=None):

        img_rgb, conf = self._run_model(image_bytes)

        core = self._make_core(conf)

        strands = self._make_strands(conf, core)

        binary = cv2.bitwise_or(core, strands)

        alpha = self._soft_alpha(conf, binary)

        rgba = np.dstack([img_rgb, alpha])

        if save_path:
            Image.fromarray(rgba, "RGBA").save(save_path)

        return rgba
