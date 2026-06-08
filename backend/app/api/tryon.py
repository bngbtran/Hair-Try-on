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

    try:
        with urllib.request.urlopen(public_url, timeout=10) as resp:
            hair_bytes = resp.read()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot fetch hair image: {exc}")

    hair_pil = Image.open(io.BytesIO(hair_bytes)).convert("RGBA")

    person_bytes = await person_image.read()
    person_pil = Image.open(io.BytesIO(person_bytes)).convert("RGBA")
    if max(person_pil.size) > _MAX_DIM:
        person_pil.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

    try:
        no_hair_pil, hair_mask = remove_old_hair(person_pil)
        result_pil = overlay_hair(person_pil, no_hair_pil, hair_mask, hair_pil)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    buf = io.BytesIO()
    result_pil.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
