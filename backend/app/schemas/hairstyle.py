from pydantic import BaseModel
from typing import Optional


class HairstyleResponse(BaseModel):
    id: int
    name: str
    image_path: str
    preview_path: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class HairstyleUpdate(BaseModel):
    name: Optional[str] = None
