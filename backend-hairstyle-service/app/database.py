from sqlalchemy import create_engine, Column, String, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from pathlib import Path

Path("storage").mkdir(exist_ok=True)

DATABASE_URL = "sqlite:///./storage/hairstyles.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class HairstyleDB(Base):
    __tablename__ = "hairstyles"

    id           = Column(String, primary_key=True, index=True)
    name         = Column(String, nullable=False)
    description  = Column(String, nullable=True)
    color        = Column(String, nullable=True)
    style_type   = Column(String, nullable=True)
    tags         = Column(JSON, default=list)
    image_path   = Column(String, nullable=True)
    mask_path    = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
