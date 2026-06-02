import io
import os
import re

from PIL import Image

from app.services.hair_segmenter import HairSegmenter
from app.services.hair_straightener import straighten_hair


_segmenter = None


def get_segmenter():
    global _segmenter

    if _segmenter is None:
        _segmenter = HairSegmenter()

    return _segmenter


def _safe_filename(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[\s]+", "_", name)
    return name or "hairstyle"


def extract_hair(image_bytes: bytes, name: str) -> str:
    segmenter = get_segmenter()

    rgba_bytes = segmenter.get_hair_rgba(image_bytes)

    hair_pil = Image.open(io.BytesIO(rgba_bytes)).convert("RGBA")
    hair_pil = straighten_hair(hair_pil)

    _base = os.environ.get("ASSETS_DIR", "assets")
    save_dir = os.path.join(_base, "hairstyles")
    os.makedirs(save_dir, exist_ok=True)

    base = _safe_filename(name)
    filename = f"{base}.png"

    counter = 1
    while os.path.exists(os.path.join(save_dir, filename)):
        filename = f"{base}_{counter}.png"
        counter += 1

    save_path = os.path.join(save_dir, filename)
    hair_pil.save(save_path)

    return save_path
