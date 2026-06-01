import os
import urllib.request

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

_MODELS = {
    "face_detector.tflite": (
        "https://storage.googleapis.com/mediapipe-models/"
        "face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
    ),
    "face_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/"
        "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
    ),
}

for _fname, _url in _MODELS.items():
    if not os.path.exists(_fname):
        print(f"Downloading {_fname} ...")
        urllib.request.urlretrieve(_url, _fname)
        print(f"Done: {_fname}")

face_detector = vision.FaceDetector.create_from_options(
    vision.FaceDetectorOptions(
        base_options=python.BaseOptions(model_asset_path="face_detector.tflite"),
        min_detection_confidence=0.5,
    )
)

face_landmarker = vision.FaceLandmarker.create_from_options(
    vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path="face_landmarker.task"),
        num_faces=1,
    )
)

print("MediaPipe face models loaded")
