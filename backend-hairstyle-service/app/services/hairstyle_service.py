from pathlib import Path
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy.orm import Session
from PIL import Image
import numpy as np
import cv2

from app.database import HairstyleDB
from app.models.hairstyle import Hairstyle, HairstyleCreate, HairstyleUpdate

STORAGE_DIR = Path("storage/hairstyles")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _to_schema(row: HairstyleDB) -> Hairstyle:
    return Hairstyle(
        id=row.id,
        name=row.name,
        description=row.description,
        color=row.color,
        style_type=row.style_type,
        tags=row.tags or [],
        image_path=row.image_path,
        mask_path=row.mask_path,
        thumbnail_path=row.thumbnail_path,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _generate_thumbnail(src: Path, dst: Path, size: tuple = (200, 200)) -> None:
    img = Image.open(src).convert("RGBA")
    img.thumbnail(size, Image.LANCZOS)
    img.save(dst, format="PNG")


def _extract_hair_mask(image_path: Path) -> Optional[Path]:
    img = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None

    if img.shape[2] == 4:
        alpha = img[:, :, 3]
        mask = (alpha > 10).astype(np.uint8) * 255
    else:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        ranges = [
            (np.array([0,   0,   0]),   np.array([180, 255,  80])),
            (np.array([0,  20,  70]),   np.array([20,  200, 200])),
            (np.array([15, 30, 100]),   np.array([35,  180, 255])),
            (np.array([0,  50,  50]),   np.array([15,  255, 255])),
            (np.array([160, 50,  50]),  np.array([180, 255, 255])),
        ]
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
        for lo, hi in ranges:
            mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lo, hi))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    mask_path = image_path.parent / f"{image_path.stem}_mask.png"
    cv2.imwrite(str(mask_path), mask)
    return mask_path


# ── CRUD ──────────────────────────────────────────────────────────────────────

def get_all_hairstyles(db: Session) -> list[Hairstyle]:
    rows = db.query(HairstyleDB).all()
    return [_to_schema(r) for r in rows]


def get_hairstyle(db: Session, hairstyle_id: str) -> Optional[Hairstyle]:
    row = db.query(HairstyleDB).filter(HairstyleDB.id == hairstyle_id).first()
    return _to_schema(row) if row else None


def create_hairstyle(db: Session, data: HairstyleCreate) -> Hairstyle:
    row = HairstyleDB(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        color=data.color,
        style_type=data.style_type,
        tags=data.tags or [],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_schema(row)


def update_hairstyle(db: Session, hairstyle_id: str, data: HairstyleUpdate) -> Optional[Hairstyle]:
    row = db.query(HairstyleDB).filter(HairstyleDB.id == hairstyle_id).first()
    if not row:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _to_schema(row)


def delete_hairstyle(db: Session, hairstyle_id: str) -> bool:
    row = db.query(HairstyleDB).filter(HairstyleDB.id == hairstyle_id).first()
    if not row:
        return False
    for path_field in ("image_path", "mask_path", "thumbnail_path"):
        path = getattr(row, path_field)
        if path and Path(path).exists():
            Path(path).unlink(missing_ok=True)
    db.delete(row)
    db.commit()
    return True


def upload_hairstyle_image(db: Session, hairstyle_id: str, file_bytes: bytes, filename: str) -> Optional[Hairstyle]:
    row = db.query(HairstyleDB).filter(HairstyleDB.id == hairstyle_id).first()
    if not row:
        return None

    dest_dir = STORAGE_DIR / hairstyle_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Always store as RGBA PNG to preserve transparency
    import io
    pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGBA")
    image_path = dest_dir / "image.png"
    pil_img.save(image_path, format="PNG")

    thumb_path = dest_dir / "thumbnail.png"
    _generate_thumbnail(image_path, thumb_path)

    mask_path = _extract_hair_mask(image_path)

    row.image_path = str(image_path.resolve())
    row.thumbnail_path = str(thumb_path.resolve())
    row.mask_path = str(mask_path.resolve()) if mask_path else None
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _to_schema(row)
