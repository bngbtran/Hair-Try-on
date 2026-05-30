from sqlalchemy import Column, Integer, String

from app.database.db import Base


class Hairstyle(Base):
    __tablename__ = "hairstyles"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    gender = Column(String, nullable=False)

    image_path = Column(String, nullable=False)

    preview_path = Column(String)

    created_at = Column(String)
