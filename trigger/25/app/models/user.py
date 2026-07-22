from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    relation: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Lead qualification (filled automatically from the conversation).
    lead_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lead_segment: Mapped[str | None] = mapped_column(String(120), nullable=True)
    lead_system: Mapped[str | None] = mapped_column(String(120), nullable=True)
    lead_need: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lead_next_step: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lead_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
