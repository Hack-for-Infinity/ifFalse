from backend.db.session import Base
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum


class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionStatus(enum.Enum):
    FREE = "free"
    PREMIUM = "premium"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole), default=UserRole.USER)

    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)

    hashed_password = Column(String)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.FREE)
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)

    summaries = relationship("Summary", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="user", uselist=False, cascade="all, delete-orphan")

    