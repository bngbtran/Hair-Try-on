import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Hairstyle
from app.services.hair_remover import remove_old_hair
from app.services.hair_overlay import overlay_hair

router = APIRouter(prefix="/tryon", tags=["Try-On"])

_MAX_DIM = 800


@router.post("")
async def tryon(
    person_image: UploadFile = File(...),
    hairstyle_id: int = Form(...),
    db: Session = Depends(get_db),
):
    """
    Ghép kiểu tóc lên ảnh người dùng.
    - person_image : ảnh người dùng (PNG/JPG)
    - hairstyle_id : ID kiểu tóc trong DB
    Trả về ảnh PNG kết quả.
    """
    hairstyle = db.query(Hairstyle).filter(Hairstyle.id == hairstyle_id).first()
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    person_bytes = await person_image.read()
    person_pil   = Image.open(io.BytesIO(person_bytes)).convert("RGBA")

    if max(person_pil.size) > _MAX_DIM:
        person_pil.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

    try:
        hair_pil = Image.open(hairstyle.image_path).convert("RGBA")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Hair image file not found on disk")

    try:
        no_hair_pil, hair_mask = remove_old_hair(person_pil)
        result_pil = overlay_hair(person_pil, no_hair_pil, hair_mask, hair_pil)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    buf = io.BytesIO()
    result_pil.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
