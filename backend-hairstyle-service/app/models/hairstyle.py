from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class HairstyleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=50)
    style_type: Optional[str] = Field(None, max_length=50)
    tags: list[str] = Field(default_factory=list)


class HairstyleCreate(HairstyleBase):
    pass


class HairstyleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=50)
    style_type: Optional[str] = Field(None, max_length=50)
    tags: Optional[list[str]] = None


class Hairstyle(HairstyleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_path: Optional[str] = None
    mask_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class HairstyleResponse(Hairstyle):
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
