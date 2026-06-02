from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.database.db import get_supabase
from app.schemas.hairstyle import HairstyleResponse
from app.services.hair_extractor import extract_hair

router = APIRouter(prefix="/admin", tags=["Admin"])

TABLE = "hairstyles"


def _row_to_response(row: dict) -> HairstyleResponse:
    return HairstyleResponse(**row)


# ── Upload ────────────────────────────────────────────────────────────────────


@router.post("/upload-hairstyle", response_model=HairstyleResponse)
async def upload_hairstyle(
    name: str = Form(...),
    image: UploadFile = File(...),
):
    image_bytes = await image.read()

    # Extract hair RGBA, upload to Supabase Storage → returns public URL
    public_url = extract_hair(image_bytes=image_bytes, name=name)

    supabase = get_supabase()
    result = (
        supabase.table(TABLE)
        .insert(
            {
                "name": name,
                "image_path": public_url,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    return _row_to_response(result.data[0])


# ── Read ──────────────────────────────────────────────────────────────────────


@router.get("/hairstyles", response_model=List[HairstyleResponse])
def get_hairstyles():
    supabase = get_supabase()
    result = supabase.table(TABLE).select("*").order("id").execute()
    return [_row_to_response(r) for r in result.data]


@router.get("/hairstyles/{hairstyle_id}", response_model=HairstyleResponse)
def get_hairstyle(hairstyle_id: int):
    supabase = get_supabase()
    result = (
        supabase.table(TABLE).select("*").eq("id", hairstyle_id).maybe_single().execute()
    )
    if result.data is None:
        raise HTTPException(status_code=404, detail="Hairstyle not found")
    return _row_to_response(result.data)


# ── Update ────────────────────────────────────────────────────────────────────


@router.put("/hairstyles/{hairstyle_id}", response_model=HairstyleResponse)
async def update_hairstyle(
    hairstyle_id: int,
    name: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    supabase = get_supabase()

    # Check exists
    existing = (
        supabase.table(TABLE).select("*").eq("id", hairstyle_id).maybe_single().execute()
    )
    if existing.data is None:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    patch: dict = {}
    if name is not None:
        patch["name"] = name
    if image is not None:
        image_bytes = await image.read()
        current_name = name or existing.data["name"]
        patch["image_path"] = extract_hair(image_bytes=image_bytes, name=current_name)

    if not patch:
        return _row_to_response(existing.data)

    result = (
        supabase.table(TABLE).update(patch).eq("id", hairstyle_id).execute()
    )
    return _row_to_response(result.data[0])


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete("/hairstyles/{hairstyle_id}")
def delete_hairstyle(hairstyle_id: int):
    from app.database.db import STORAGE_BUCKET

    supabase = get_supabase()

    existing = (
        supabase.table(TABLE).select("image_path").eq("id", hairstyle_id).maybe_single().execute()
    )
    if existing.data is None:
        raise HTTPException(status_code=404, detail="Hairstyle not found")

    # Delete DB record
    supabase.table(TABLE).delete().eq("id", hairstyle_id).execute()

    # Delete file from Storage (best-effort — extract filename from URL)
    image_url: str = existing.data.get("image_path", "")
    if image_url:
        filename = image_url.split("/")[-1]
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([filename])
        except Exception:
            pass  # Storage deletion is best-effort

    return {"message": f"Hairstyle {hairstyle_id} deleted"}
