from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.hairstyle import HairstyleCreate, HairstyleUpdate, HairstyleResponse, Hairstyle
from app.services import hairstyle_service

router = APIRouter(prefix="/hairstyles", tags=["hairstyles"])


def _to_response(hairstyle: Hairstyle, base_url: str) -> HairstyleResponse:
    data = hairstyle.model_dump()
    response = HairstyleResponse(**data)
    if hairstyle.image_path:
        response.image_url = f"{base_url}/hairstyles/{hairstyle.id}/image"
    if hairstyle.thumbnail_path:
        response.thumbnail_url = f"{base_url}/hairstyles/{hairstyle.id}/thumbnail"
    return response


@router.get("/", response_model=list[HairstyleResponse])
def list_hairstyles(request: Request, db: Session = Depends(get_db)):
    base_url = str(request.base_url).rstrip("/")
    return [_to_response(h, base_url) for h in hairstyle_service.get_all_hairstyles(db)]


@router.get("/{hairstyle_id}", response_model=HairstyleResponse)
def get_hairstyle(hairstyle_id: str, request: Request, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.get_hairstyle(db, hairstyle_id)
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")
    return _to_response(hairstyle, str(request.base_url).rstrip("/"))


@router.post("/", response_model=HairstyleResponse, status_code=201)
def create_hairstyle(data: HairstyleCreate, request: Request, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.create_hairstyle(db, data)
    return _to_response(hairstyle, str(request.base_url).rstrip("/"))


@router.patch("/{hairstyle_id}", response_model=HairstyleResponse)
def update_hairstyle(hairstyle_id: str, data: HairstyleUpdate, request: Request, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.update_hairstyle(db, hairstyle_id, data)
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")
    return _to_response(hairstyle, str(request.base_url).rstrip("/"))


@router.delete("/{hairstyle_id}", status_code=204)
def delete_hairstyle(hairstyle_id: str, db: Session = Depends(get_db)):
    if not hairstyle_service.delete_hairstyle(db, hairstyle_id):
        raise HTTPException(status_code=404, detail="Hairstyle not found")


@router.post("/{hairstyle_id}/upload", response_model=HairstyleResponse)
def upload_image(hairstyle_id: str, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(status_code=400, detail="File must be a PNG, JPEG, or WebP image")
    file_bytes = file.file.read()
    hairstyle = hairstyle_service.upload_hairstyle_image(db, hairstyle_id, file_bytes, file.filename or "image.png")
    if not hairstyle:
        raise HTTPException(status_code=404, detail="Hairstyle not found")
    return _to_response(hairstyle, str(request.base_url).rstrip("/"))


@router.get("/{hairstyle_id}/image")
def get_image(hairstyle_id: str, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.get_hairstyle(db, hairstyle_id)
    if not hairstyle or not hairstyle.image_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(hairstyle.image_path, media_type="image/png")


@router.get("/{hairstyle_id}/thumbnail")
def get_thumbnail(hairstyle_id: str, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.get_hairstyle(db, hairstyle_id)
    if not hairstyle or not hairstyle.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(hairstyle.thumbnail_path)


@router.get("/{hairstyle_id}/mask")
def get_mask(hairstyle_id: str, db: Session = Depends(get_db)):
    hairstyle = hairstyle_service.get_hairstyle(db, hairstyle_id)
    if not hairstyle or not hairstyle.mask_path:
        raise HTTPException(status_code=404, detail="Mask not found")
    return FileResponse(hairstyle.mask_path, media_type="image/png")
