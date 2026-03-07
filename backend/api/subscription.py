from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from backend.db.session import get_db
from backend.db.user import User, SubscriptionStatus
from backend.schemas.subscription import SubscribeRequest, SubscriptionResponse
from backend.core.deps import get_current_user

router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.post("/subscribe", response_model=SubscriptionResponse)
def subscribe(
    request: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.plan != "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan. Available plans: 'premium'",
        )

    # Stub: no real payment processing — just activate the subscription
    now = datetime.now(timezone.utc)
    current_user.subscription_status = SubscriptionStatus.PREMIUM
    current_user.subscription_start_date = now
    current_user.subscription_end_date = now + timedelta(days=30)

    db.commit()
    db.refresh(current_user)

    return SubscriptionResponse(
        subscription_status=current_user.subscription_status.value,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date,
    )


@router.get("/", response_model=SubscriptionResponse)
def get_subscription(
    current_user: User = Depends(get_current_user),
):
    return SubscriptionResponse(
        subscription_status=current_user.subscription_status.value,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date,
    )
