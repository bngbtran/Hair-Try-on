from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Hairstyle
from app.schemas.hairstyle import HairstyleResponse
from app.services.hair_extractor import extract_hair

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/upload-hairstyle", response_model=HairstyleResponse)
async def upload_hairstyle(
    name: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    image_bytes = await image.read()
    hair_path = extract_hair(image_bytes=image_bytes, name=name)

    hairstyle = Hairstyle(
        name=name,
        image_path=hair_path,
        created_at=str(datetime.now()),
    )
    db.add(hairstyle)
    db.commit()
    db.refresh(hairstyle)
    return hairstyle


@router.get("/hairstyles", response_model=List[HairstyleResponse])
def get_hairstyles(
    db: Session = Depends(get_db),
):
    return db.query(Hairstyle).all()


@router.get("/hairstyles/{hairstyle_id}", response_model=HairstyleResponse)
def get_hairstyle(hairstyle_id: int, db: Session = Depends(get_db)):
    hairstyle = db.query(Hairstyle).filter(Hairstyle.id == hairstyle_id).first()
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")
    return hairstyle


@router.put("/hairstyles/{hairstyle_id}", response_model=HairstyleResponse)
async def update_hairstyle(
    hairstyle_id: int,
    name: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    hairstyle = db.query(Hairstyle).filter(Hairstyle.id == hairstyle_id).first()
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    if name is not None:
        hairstyle.name = name
    if image is not None:
        image_bytes = await image.read()
        hairstyle.image_path = extract_hair(
            image_bytes=image_bytes,
            name=hairstyle.name,
        )

    db.commit()
    db.refresh(hairstyle)
    return hairstyle


@router.delete("/hairstyles/{hairstyle_id}")
def delete_hairstyle(hairstyle_id: int, db: Session = Depends(get_db)):
    hairstyle = db.query(Hairstyle).filter(Hairstyle.id == hairstyle_id).first()
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    db.delete(hairstyle)
    db.commit()
    return {"message": f"Hairstyle {hairstyle_id} deleted"}
