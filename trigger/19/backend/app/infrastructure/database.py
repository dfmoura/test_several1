from __future__ import annotations

import os
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Numeric, String, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class ImportBatchORM(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    row_count: Mapped[int] = mapped_column(default=0)
    duplicate_count: Mapped[int] = mapped_column(default=0)


class MovementORM(Base):
    __tablename__ = "movements"
    __table_args__ = (UniqueConstraint("external_key", name="uq_movement_external_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    import_batch_id: Mapped[int | None] = mapped_column(nullable=True)
    external_key: Mapped[str] = mapped_column(String(64), index=True)
    trade_date: Mapped[datetime] = mapped_column(Date)
    kind: Mapped[str] = mapped_column(String(20))
    ticker: Mapped[str] = mapped_column(String(12), index=True)
    product: Mapped[str] = mapped_column(Text)
    institution: Mapped[str] = mapped_column(String(255), default="")
    direction: Mapped[str] = mapped_column(String(20))
    movement_label: Mapped[str] = mapped_column(String(120))
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    income_type: Mapped[str | None] = mapped_column(String(30), nullable=True)


settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.upload_dir, exist_ok=True)
