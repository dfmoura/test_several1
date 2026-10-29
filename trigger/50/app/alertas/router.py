"""API de alertas configuráveis — Fase 9."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.alertas.service import atualizar_regra, avaliar_alertas, listar_regras
from app.auth.deps import require_admin
from app.database import Usuario, get_db
from app.escopo import resolver_escopo

router = APIRouter(prefix="/api/alertas", tags=["alertas"])


class RegraPatch(BaseModel):
    limiar: int | None = Field(None, ge=0, le=1_000_000)
    ativo: bool | None = None
    severidade: str | None = None


@router.get("/avaliacao")
def get_avaliacao(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx = resolver_escopo(db, user, request=request)
    return avaliar_alertas(db, unidade=ctx.unidade_contexto, ids_filiais=ctx.ids_filiais)


@router.get("/regras")
def get_regras(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> list[dict[str, Any]]:
    _ = user
    return [
        {
            "id": r.id,
            "chave": r.chave,
            "nome": r.nome,
            "descricao": r.descricao,
            "metrica": r.metrica,
            "operador": r.operador,
            "limiar": r.limiar,
            "severidade": r.severidade,
            "ativo": r.ativo,
        }
        for r in listar_regras(db)
    ]


@router.patch("/regras/{regra_id}")
def patch_regra(
    regra_id: int,
    body: RegraPatch,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        row = atualizar_regra(
            db,
            regra_id,
            limiar=body.limiar,
            ativo=body.ativo,
            severidade=body.severidade,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "id": row.id,
        "chave": row.chave,
        "limiar": row.limiar,
        "ativo": row.ativo,
        "severidade": row.severidade,
    }
