"""API de responsável operacional (visão de filial)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.acompanhamento.service import (
    AcompanhamentoError,
    associar,
    desassociar,
    esta_acompanhada,
    responsavel_da_contratacao,
)
from app.auth.deps import require_login
from app.database import Usuario, get_db
from app.escopo import codigos_uasg_escopo_usuario

router = APIRouter(prefix="/api/acompanhamento", tags=["acompanhamento"])


def _raise(exc: AcompanhamentoError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _filial_id(ctx) -> int | None:
    if ctx.unidade_contexto is not None and ctx.unidade_contexto.tipo == "filial":
        return int(ctx.unidade_contexto.id)
    if ctx.ids_filiais and len(ctx.ids_filiais) == 1:
        return int(ctx.ids_filiais[0])
    return None


@router.post("/contratacoes/{contratacao_id}")
def post_associar(
    contratacao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Assume o acompanhamento (1 responsável por contratação na filial)."""
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    try:
        return associar(
            db,
            user=user,
            ctx=ctx,
            escopo_uasgs=escopo,
            contratacao_id=contratacao_id,
        )
    except AcompanhamentoError as exc:
        _raise(exc)
        raise  # pragma: no cover


@router.delete("/contratacoes/{contratacao_id}")
def delete_associar(
    contratacao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Deixa de ser o responsável (soft) — só o responsável atual."""
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    try:
        return desassociar(
            db,
            user=user,
            ctx=ctx,
            escopo_uasgs=escopo,
            contratacao_id=contratacao_id,
        )
    except AcompanhamentoError as exc:
        _raise(exc)
        raise  # pragma: no cover


@router.get("/contratacoes/{contratacao_id}")
def get_status(
    contratacao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Status do responsável da contratação (escopo filial)."""
    from app.escopo import eh_visao_filial

    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    if not eh_visao_filial(ctx):
        raise HTTPException(
            status_code=403,
            detail=(
                "Acompanhamento disponível apenas na visão de filial. "
                "Use o filtro de visão ou acesse com um login de filial."
            ),
        )
    from app.database import Contratacao

    c = db.get(Contratacao, contratacao_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Contratação não encontrada.")
    if escopo is not None and c.unidade_compradora not in escopo:
        raise HTTPException(status_code=403, detail="Contratação fora do escopo da filial.")
    filial_id = _filial_id(ctx)
    resp = responsavel_da_contratacao(
        db, contratacao_id=contratacao_id, unidade_id=filial_id
    )
    return {
        "contratacao_id": contratacao_id,
        "responsavel": resp,
        "acompanhada_por_mim": esta_acompanhada(
            db,
            usuario_id=user.id,
            contratacao_id=contratacao_id,
            unidade_id=filial_id,
        ),
    }
