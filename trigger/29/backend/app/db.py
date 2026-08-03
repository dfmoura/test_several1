"""Persistência mínima — Postgres (Docker) com fallback SQLite para dev/test."""

from __future__ import annotations

import json
import os
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:////tmp/orcamento.db",
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    cliente: Mapped[str] = mapped_column(String(255))
    payload_json: Mapped[str] = mapped_column(Text)
    result_json: Mapped[str] = mapped_column(Text)
    chave_matriz: Mapped[str] = mapped_column(String(64), index=True)
    cobra_matriz: Mapped[bool] = mapped_column(Boolean, default=True)
    valor_matriz: Mapped[float] = mapped_column(Float, default=0.0)
    prazo_entrega: Mapped[str] = mapped_column(String(120), default="12 DIAS ÚTEIS")
    validade_proposta: Mapped[str] = mapped_column(String(120), default="7 dias")
    tolerancia_qtd_pct: Mapped[float] = mapped_column(Float, default=20.0)


class MatrizCobrada(Base):
    __tablename__ = "matrizes_cobradas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chave_matriz: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    cliente: Mapped[str] = mapped_column(String(255))
    quote_id: Mapped[int] = mapped_column(Integer)
    valor: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)
