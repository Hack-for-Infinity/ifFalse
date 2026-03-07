from backend.db.session import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    original_url = Column(String, nullable=True)
    original_content = Column(Text, nullable=True)
    summary_text = Column(Text, nullable=False)
    summary_length = Column(String, default="medium")  # short, medium, long
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="summaries")
    # feedbacks = relationship("Feedback", back_populates="summary", cascade="all, delete-orphan")
