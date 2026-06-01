from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router

app = FastAPI(title="Hair Try-On API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "Hair Try-On API Running"}


from app.database.db import engine
from app.database.models import Base

Base.metadata.create_all(bind=engine)
