from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SubscribeRequest(BaseModel):
    plan: str  # "premium"


class SubscriptionResponse(BaseModel):
    subscription_status: str
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None

    class Config:
        from_attributes = True
