from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SummarizeRequest(BaseModel):
    url: Optional[str] = None
    content: Optional[str] = None
    preferred_length: str = "medium"  # short, medium, long


class SummaryResponse(BaseModel):
    id: int
    original_url: Optional[str] = None
    summary_text: str
    summary_length: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SummaryListResponse(BaseModel):
    summaries: list[SummaryResponse]
    total: int
