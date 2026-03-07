from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FeedbackCreate(BaseModel):
    summary_id: int
    rating: int  # 1-5
    feedback_text: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: int
    summary_id: int
    rating: int
    feedback_text: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
