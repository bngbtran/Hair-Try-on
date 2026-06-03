import io
import re
import unicodedata
import uuid

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
    # Chuẩn hóa Unicode → bỏ dấu → giữ ASCII (ư→u, ổ→o, ầ→a ...)
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.strip().lower()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[\s]+", "_", name)
    return name or "hairstyle"


def extract_hair(image_bytes: bytes, name: str) -> str:
    """
    1. Tách tóc RGBA bằng HairSegmenter
    2. Nắn thẳng tóc
    3. Upload PNG lên Supabase Storage (bucket: hairstyles)
    4. Trả về public URL để lưu vào DB
    """
    from app.database.db import get_supabase, STORAGE_BUCKET

    segmenter = get_segmenter()

    # ── Segment + straighten ──────────────────────────────────────────────────
    rgba_bytes = segmenter.get_hair_rgba(image_bytes)
    hair_pil = Image.open(io.BytesIO(rgba_bytes)).convert("RGBA")
    hair_pil = straighten_hair(hair_pil)

    # ── Serialize to PNG bytes ────────────────────────────────────────────────
    buf = io.BytesIO()
    hair_pil.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # ── Upload to Supabase Storage ────────────────────────────────────────────
    # Unique filename: safe_name + short UUID to avoid collisions
    base = _safe_filename(name)
    filename = f"{base}_{uuid.uuid4().hex[:8]}.png"

    supabase = get_supabase()
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path=filename,
        file=png_bytes,
        file_options={"contentType": "image/png", "upsert": "true"},
    )

    # ── Return CDN public URL ─────────────────────────────────────────────────
    public_url: str = supabase.storage.from_(STORAGE_BUCKET).get_public_url(filename)
    return public_url
