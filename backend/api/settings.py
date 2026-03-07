from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.user import User
from backend.db.settings import Settings
from backend.schemas.settings import SettingsUpdate, SettingsResponse
from backend.core.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


def get_or_create_settings(db: Session, user: User) -> Settings:
    """Get existing settings or create defaults for a user."""
    settings = db.query(Settings).filter(Settings.user_id == user.id).first()
    if not settings:
        settings = Settings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_or_create_settings(db, current_user)
    return settings


@router.post("/", response_model=SettingsResponse)
def update_settings(
    settings_data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_or_create_settings(db, current_user)

    update_data = settings_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
