import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.tryon import router as tryon_router
from app.database.db import SUPABASE_KEY, SUPABASE_URL

app = FastAPI(title="Hair Try-On API")

_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://tranbnb-hairtryon.vercel.app,"
    "http://localhost:8081,"
    "http://localhost:19006,"
    "http://localhost:3000",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
    ],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=3600,
)

app.include_router(admin_router)
app.include_router(tryon_router)


@app.on_event("startup")
def validate_env():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Missing SUPABASE_URL / SUPABASE_KEY. "
            "Set them in Render environment variables or backend/.env for local development."
        )


@app.get("/")
def root():
    return {"message": "Hair Try-On API Running"}
