import io
import urllib.request

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

from app.database.db import get_supabase
from app.services.hair_remover import remove_old_hair
from app.services.hair_overlay import overlay_hair

router = APIRouter(prefix="/tryon", tags=["Try-On"])

TABLE = "hairstyles"
_MAX_DIM = 800


@router.post("")
async def tryon(
    person_image: UploadFile = File(...),
    hairstyle_id: int = Form(...),
):
    """
    Ghép kiểu tóc lên ảnh người dùng.
    - person_image : ảnh người dùng (PNG/JPG)
    - hairstyle_id : ID kiểu tóc trong Supabase DB
    Trả về ảnh PNG kết quả.
    """
    # ── Load hairstyle record from Supabase DB ────────────────────────────────
    supabase = get_supabase()
    result = (
        supabase.table(TABLE)
        .select("image_path")
        .eq("id", hairstyle_id)
        .maybe_single()
        .execute()
    )
    if result.data is None:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    public_url: str = result.data["image_path"]

    # ── Download hair RGBA image from Supabase Storage (CDN) ─────────────────
    try:
        with urllib.request.urlopen(public_url, timeout=10) as resp:
            hair_bytes = resp.read()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot fetch hair image: {exc}")

    hair_pil = Image.open(io.BytesIO(hair_bytes)).convert("RGBA")

    # ── Load & resize person image ────────────────────────────────────────────
    person_bytes = await person_image.read()
    person_pil = Image.open(io.BytesIO(person_bytes)).convert("RGBA")
    if max(person_pil.size) > _MAX_DIM:
        person_pil.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

    # ── Run ML pipeline ───────────────────────────────────────────────────────
    try:
        no_hair_pil, hair_mask = remove_old_hair(person_pil)
        result_pil = overlay_hair(person_pil, no_hair_pil, hair_mask, hair_pil)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # ── Stream PNG back (not saved on server) ─────────────────────────────────
    buf = io.BytesIO()
    result_pil.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
