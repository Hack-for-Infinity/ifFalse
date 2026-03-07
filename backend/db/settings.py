from backend.db.session import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    preferred_summary_length = Column(String, default="medium")  # short, medium, long
    theme = Column(String, default="light")  # light, dark

    user = relationship("User", back_populates="settings")
