import io
import os
import uuid

from PIL import Image

from app.services.hair_segmenter import HairSegmenter
from app.services.hair_straightener import straighten_hair


segmenter = HairSegmenter()


def extract_hair(image_bytes: bytes, gender: str):

    rgba_bytes = segmenter.get_hair_rgba(image_bytes)

    hair_pil = Image.open(io.BytesIO(rgba_bytes)).convert("RGBA")

    hair_pil = straighten_hair(hair_pil)

    filename = f"{os.name}.png"

    save_dir = f"assets/hairstyles/{gender}"

    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, filename)

    hair_pil.save(save_path)

    return save_path
