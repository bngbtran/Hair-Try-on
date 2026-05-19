from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.routes.face_routes import router as face_router

app = FastAPI(
    title="Face Service",
    description="Face detection, alignment, hair segmentation, and hairstyle overlay",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("temp").mkdir(exist_ok=True)

app.include_router(face_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "face-service"}
