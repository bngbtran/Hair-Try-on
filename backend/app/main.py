from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.tryon import router as tryon_router

app = FastAPI(title="Hair Try-On API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(tryon_router)


@app.get("/")
def root():
    return {"message": "Hair Try-On API Running"}
