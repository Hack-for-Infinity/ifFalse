from pydantic import BaseModel
from typing import Optional


class SettingsUpdate(BaseModel):
    preferred_summary_length: Optional[str] = None  # short, medium, long
    theme: Optional[str] = None  # light, dark


class SettingsResponse(BaseModel):
    id: int
    preferred_summary_length: str
    theme: str

    class Config:
        from_attributes = True
