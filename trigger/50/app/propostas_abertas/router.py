"""API Propostas abertas — visão filial · sem IA."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.auth.deps import require_login
from app.consultas.service import facetas_contratacoes_escopo
from app.database import Usuario, get_db
from app.escopo import ContextoEscopo, codigos_uasg_escopo_usuario, eh_visao_filial
from app.propostas_abertas import service as svc

router = APIRouter(prefix="/api/propostas-abertas", tags=["propostas-abertas"])

_MSG_SO_FILIAL = (
    "Propostas abertas está disponível apenas na visão de filial. "
    "Use o filtro de visão ou acesse com um login de filial."
)

HorizonteQ = Literal["24h", "72h", "7d", "30d", "todos"]


def _exigir_visao_filial(ctx: ContextoEscopo) -> None:
    if not eh_visao_filial(ctx):
        raise HTTPException(status_code=403, detail=_MSG_SO_FILIAL)


def _modo_acompanhamento(raw: str | None) -> str | None:
    modo = (raw or "").strip().lower() or None
    if modo in ("", "todas", "all"):
        return None
    if modo and modo not in ("minhas", "sem", "com", "sem_resp"):
        raise HTTPException(
            status_code=400,
            detail=(
                "acompanhamento inválido. Use: minhas, sem, com, sem_resp ou todas."
            ),
        )
    return modo


def _filial_ids_cobertura(ctx: ContextoEscopo) -> list[int] | None:
    """IDs de filial para filtro com/sem_resp; None se o modo não for cobertura."""
    if ctx.unidade_contexto is not None and ctx.unidade_contexto.tipo == "filial":
        return [int(ctx.unidade_contexto.id)]
    if ctx.ids_filiais:
        return [int(x) for x in ctx.ids_filiais]
    return []


def _kwargs_acompanhamento(modo: str | None, user: Usuario, ctx: ContextoEscopo) -> dict:
    if not modo:
        return {
            "acompanhamento": None,
            "acompanhamento_usuario_id": None,
            "acompanhamento_unidade_ids": None,
        }
    if modo in ("minhas", "sem"):
        return {
            "acompanhamento": modo,
            "acompanhamento_usuario_id": user.id,
            "acompanhamento_unidade_ids": None,
        }
    return {
        "acompanhamento": modo,
        "acompanhamento_usuario_id": None,
        "acompanhamento_unidade_ids": _filial_ids_cobertura(ctx),
    }


@router.get("/filtros")
def filtros_propostas(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Facetas da visão filial: UASGs = cadastro Filial↔UASG da filial filtrada."""
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    facetas = facetas_contratacoes_escopo(db, escopo_uasgs=escopo)
    # UASG do filtro = vínculo territorial da filial da visão (não “qualquer UASG na base”).
    facetas["uasgs"] = svc.uasgs_da_filial_visao(db, escopo_uasgs=escopo)
    facetas["filial_id"] = (
        int(ctx.unidade_contexto.id)
        if ctx.unidade_contexto is not None
        else (int(ctx.ids_filiais[0]) if ctx.ids_filiais else None)
    )
    facetas["filial_rotulo"] = ctx.rotulo
    return facetas


@router.get("/resumo")
def resumo_propostas(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    horizonte: HorizonteQ = Query("todos"),
    codigo_uasg: str | None = Query(None, max_length=10),
    modalidade_codigo: list[str] | None = Query(None),
    material_ou_servico: str | None = Query(None, max_length=1),
    q: str | None = Query(None, max_length=200),
    acompanhamento: str | None = Query(None, max_length=12),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    modo = _modo_acompanhamento(acompanhamento)
    return svc.resumo_abertas(
        db,
        escopo_uasgs=escopo,
        horizonte=horizonte,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigo,
        material_ou_servico=material_ou_servico,
        q=q,
        **_kwargs_acompanhamento(modo, user, ctx),
    )


@router.get("/itens")
def listar_itens(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    horizonte: HorizonteQ = Query("todos"),
    codigo_uasg: str | None = Query(None, max_length=10),
    modalidade_codigo: list[str] | None = Query(None),
    material_ou_servico: str | None = Query(None, max_length=1),
    q: str | None = Query(None, max_length=200),
    acompanhamento: str | None = Query(None, max_length=12),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort: str | None = Query(None, max_length=40),
    sort_dir: str | None = Query(None, max_length=4),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    modo = _modo_acompanhamento(acompanhamento)
    kw = _kwargs_acompanhamento(modo, user, ctx)
    # Flags «Eu» na grade: sempre o usuário logado (independente do filtro).
    kw["acompanhamento_usuario_id"] = user.id
    filial_ids = _filial_ids_cobertura(ctx)
    kw["acompanhamento_filial_id"] = (
        filial_ids[0] if filial_ids and len(filial_ids) == 1 else None
    )
    return svc.listar_itens_abertos(
        db,
        escopo_uasgs=escopo,
        horizonte=horizonte,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigo,
        material_ou_servico=material_ou_servico,
        q=q,
        sort=sort,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        **kw,
    )


@router.get("/itens/{item_id}")
def detalhe_item(
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    data = svc.detalhe_item(db, item_id=item_id, escopo_uasgs=escopo)
    if data is None:
        # Distingue 404 vs 403: se o item existe fora do escopo → 403.
        from sqlalchemy import select

        from app.database import ItemContratacao

        existe = db.scalar(
            select(ItemContratacao.id).where(ItemContratacao.id == item_id)
        )
        if existe is None:
            raise HTTPException(status_code=404, detail="Item não encontrado.")
        raise HTTPException(status_code=403, detail="Fora do escopo do seu usuário.")
    return data
