from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.database import create_tables
from app.routes.hairstyle_routes import router as hairstyle_router

app = FastAPI(
    title="Hairstyle Service",
    description="Manages hairstyle assets with SQLite database",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("storage/hairstyles").mkdir(parents=True, exist_ok=True)


@app.on_event("startup")
def startup():
    create_tables()


app.include_router(hairstyle_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "hairstyle-service", "db": "sqlite"}
