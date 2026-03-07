from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.user import User
from backend.db.summary import Summary
from backend.schemas.summary import SummarizeRequest, SummaryResponse, SummaryListResponse
from backend.core.deps import get_current_user
from backend.core.anthropic_client import summarize_content
import httpx

router = APIRouter(prefix="/summarize", tags=["Summarization"])


@router.post("/", response_model=SummaryResponse, status_code=status.HTTP_201_CREATED)
def create_summary(
    request: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.url and not request.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'url' or 'content' must be provided",
        )

    content = request.content

    # If URL is provided, fetch the page content
    if request.url and not content:
        try:
            response = httpx.get(request.url, timeout=15.0, follow_redirects=True)
            response.raise_for_status()
            content = response.text
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch content from the provided URL",
            )

    # Call Anthropic to summarize
    try:
        summary_text = summarize_content(content, length=request.preferred_length)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary. Please try again later.",
        )

    summary = Summary(
        user_id=current_user.id,
        original_url=request.url,
        original_content=content,
        summary_text=summary_text,
        summary_length=request.preferred_length,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/", response_model=SummaryListResponse)
def list_summaries(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Summary).filter(Summary.user_id == current_user.id)
    total = query.count()
    summaries = query.order_by(Summary.created_at.desc()).offset(skip).limit(limit).all()
    return SummaryListResponse(summaries=summaries, total=total)
