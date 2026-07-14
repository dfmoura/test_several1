"""CRUD de observadores (campos manuais preservados nas re-sincronizações)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Observador, get_db

router = APIRouter(prefix="/api/observadores", tags=["observadores"])


class ObservadorOut(BaseModel):
    id: int
    nome: str
    email: str | None = None
    telefone: str | None = None
    ativo: bool = True
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class ObservadorCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    telefone: str | None = Field(default=None, max_length=40)


class ObservadorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    telefone: str | None = Field(default=None, max_length=40)
    ativo: bool | None = None


@router.get("", response_model=list[ObservadorOut])
def listar_observadores(
    db: Session = Depends(get_db),
    ativos: bool = Query(True),
):
    stmt = select(Observador).order_by(Observador.nome)
    if ativos:
        stmt = stmt.where(Observador.ativo.is_(True))
    return [ObservadorOut.model_validate(o) for o in db.scalars(stmt).all()]


@router.post("", response_model=ObservadorOut, status_code=201)
def criar_observador(payload: ObservadorCreate, db: Session = Depends(get_db)):
    obs = Observador(
        nome=payload.nome.strip(),
        email=(payload.email or "").strip() or None,
        telefone=(payload.telefone or "").strip() or None,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return ObservadorOut.model_validate(obs)


@router.patch("/{oid}", response_model=ObservadorOut)
def atualizar_observador(oid: int, payload: ObservadorUpdate, db: Session = Depends(get_db)):
    obs = db.get(Observador, oid)
    if not obs:
        raise HTTPException(404, "Observador não encontrado")
    for field in ("nome", "email", "telefone", "ativo"):
        value = getattr(payload, field)
        if value is not None:
            if field in ("nome", "email", "telefone") and isinstance(value, str):
                value = value.strip() or (None if field != "nome" else value)
            setattr(obs, field, value)
    db.commit()
    db.refresh(obs)
    return ObservadorOut.model_validate(obs)
