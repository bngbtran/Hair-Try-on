import os
import urllib.request

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from app.utils.models_dir import resolve_models_dir

_MODELS_DIR = resolve_models_dir()

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
    _fpath = os.path.join(_MODELS_DIR, _fname)
    if not os.path.exists(_fpath):
        print(f"Downloading {_fname} ...")
        urllib.request.urlretrieve(_url, _fpath)
        print(f"Done: {_fname}")

_detector_path = os.path.join(_MODELS_DIR, "face_detector.tflite")
_landmarker_path = os.path.join(_MODELS_DIR, "face_landmarker.task")

_face_detector = None
_face_landmarker = None


def get_face_detector():
    global _face_detector

    if _face_detector is None:
        _face_detector = vision.FaceDetector.create_from_options(
            vision.FaceDetectorOptions(
                base_options=python.BaseOptions(
                    model_asset_path=_detector_path
                ),
                min_detection_confidence=0.5,
            )
        )

    return _face_detector


def get_face_landmarker():
    global _face_landmarker

    if _face_landmarker is None:
        _face_landmarker = vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=python.BaseOptions(
                    model_asset_path=_landmarker_path
                ),
                num_faces=1,
            )
        )

    return _face_landmarker