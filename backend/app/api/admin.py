from datetime import datetime

from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import Form
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.database.models import Hairstyle

from app.services.hair_extractor import extract_hair

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/upload-hairstyle")
async def upload_hairstyle(
    name: str = Form(...), gender: str = Form(...), image: UploadFile = File(...)
):

    image_bytes = await image.read()

    hair_path = extract_hair(image_bytes=image_bytes, gender=gender)

    db: Session = SessionLocal()

    hairstyle = Hairstyle(
        name=name, gender=gender, image_path=hair_path, created_at=str(datetime.now())
    )

    db.add(hairstyle)
    db.commit()
    db.refresh(hairstyle)

    return {"message": "Upload success", "id": hairstyle.id, "path": hair_path}
