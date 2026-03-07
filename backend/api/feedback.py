from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.user import User
from backend.db.summary import Summary
from backend.db.feedback import Feedback
from backend.schemas.feedback import FeedbackCreate, FeedbackResponse
from backend.core.deps import get_current_user

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate rating range
    if feedback_data.rating < 1 or feedback_data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5",
        )

    # Verify summary exists and belongs to user
    summary = db.query(Summary).filter(
        Summary.id == feedback_data.summary_id,
        Summary.user_id == current_user.id,
    ).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    feedback = Feedback(
        user_id=current_user.id,
        summary_id=feedback_data.summary_id,
        rating=feedback_data.rating,
        feedback_text=feedback_data.feedback_text,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
