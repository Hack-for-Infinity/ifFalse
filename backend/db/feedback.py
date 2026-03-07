from backend.db.session import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    summary_id = Column(Integer, ForeignKey("summaries.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 scale
    feedback_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="feedbacks")
    summary = relationship("Summary", back_populates="feedbacks")
