import io
import logging
import urllib.request

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

from app.database.db import get_supabase
from app.services.hair_remover import remove_old_hair
from app.services.hair_overlay import overlay_hair

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/tryon", tags=["Try-On"])

TABLE = "hairstyles"
_MAX_DIM = 800


@router.post("")
async def tryon(
    person_image: UploadFile = File(...),
    hairstyle_id: int = Form(...),
):
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

    if not public_url or not public_url.startswith("http"):
        raise HTTPException(status_code=502, detail="Invalid hairstyle image URL")

    try:
        with urllib.request.urlopen(public_url, timeout=10) as resp:
            hair_bytes = resp.read()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot fetch hair image: {exc}")

    try:
        hair_pil = Image.open(io.BytesIO(hair_bytes)).convert("RGBA")
        person_bytes = await person_image.read()
        person_pil = Image.open(io.BytesIO(person_bytes)).convert("RGBA")
    except Exception as exc:
        logger.exception("Invalid image upload or hairstyle image")
        raise HTTPException(status_code=422, detail=f"Invalid image format: {exc}")

    if max(person_pil.size) > _MAX_DIM:
        person_pil.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

    try:
        no_hair_pil, hair_mask = remove_old_hair(person_pil)
        result_pil = overlay_hair(person_pil, no_hair_pil, hair_mask, hair_pil)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as exc:
        logger.exception("Try-on pipeline failed")
        raise HTTPException(status_code=500, detail=f"Try-on pipeline error: {exc}")

    buf = io.BytesIO()
    result_pil.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
