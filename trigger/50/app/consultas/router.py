"""API de consultas e indicadores — escopo pelo login (sem Power BI)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import require_login
from app.consultas.deps import periodo_query
from app.consultas.periodo import PeriodoAplicado
from app.consultas.distribuicao import distribuicao_geografica
from app.consultas.service import (
    comparativos,
    indicadores,
    listar_contratacoes_escopo,
    onboarding,
    status_operacional,
)
from app.consultas import vencedores as vencedores_svc
from app.database import ItemContratacao, Usuario, get_db
from app.escopo import (
    ContextoEscopo,
    codigos_uasg_escopo_usuario,
    eh_visao_filial,
)

router = APIRouter(prefix="/api/consultas", tags=["consultas"])

_MSG_SO_FILIAL = (
    "Disponível apenas na visão de filial. "
    "Use o filtro de visão ou acesse com um login de filial."
)


def _exigir_visao_filial(ctx: ContextoEscopo) -> None:
    if not eh_visao_filial(ctx):
        raise HTTPException(status_code=403, detail=_MSG_SO_FILIAL)


@router.get("/indicadores")
def get_indicadores(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    periodo_aplicado=Depends(periodo_query),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    out = indicadores(
        db,
        unidade=ctx.unidade_contexto,
        escopo_uasgs=escopo,
        ids_filiais=ctx.ids_filiais,
        escopo_modo=ctx.modo,
        periodo=periodo_aplicado,
        usuario_id=user.id,
    )
    out["escopo_modo"] = ctx.modo
    out["escopo_rotulo"] = ctx.rotulo
    if not out.get("unidade_nome"):
        out["unidade_nome"] = ctx.rotulo
        out["unidade_tipo"] = ctx.modo
    return out


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return status_operacional(db)


@router.get("/onboarding")
def get_onboarding(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    return onboarding(
        db,
        unidade=ctx.unidade_contexto,
        escopo_uasgs=escopo,
        escopo_modo=ctx.modo,
        user=user,
    )


@router.get("/comparativos")
def get_comparativos(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    limit: int = Query(10, ge=1, le=50),
    periodo_aplicado=Depends(periodo_query),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    return comparativos(
        db,
        escopo_uasgs=escopo,
        ids_filiais=ctx.ids_filiais,
        escopo_modo=ctx.modo,
        limit=limit,
        periodo=periodo_aplicado,
    )


@router.get("/distribuicao-geografica")
def get_distribuicao_geografica(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    metrica: str = Query("quantidade", pattern="^(quantidade|valor)$"),
    periodo_aplicado: PeriodoAplicado = Depends(periodo_query),
) -> dict[str, Any]:
    """Mapa do Início — sede dos vencedores no escopo da filial."""
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    out = distribuicao_geografica(
        db,
        escopo_uasgs=escopo,
        periodo=periodo_aplicado,
        metrica="valor" if metrica == "valor" else "quantidade",
    )
    out["escopo_modo"] = ctx.modo
    out["escopo_rotulo"] = ctx.rotulo
    return out


@router.get("/contratacoes")
def get_contratacoes(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    q: str | None = Query(None, max_length=200),
    codigo_uasg: str | None = Query(None, max_length=10),
    limit: int = Query(50, ge=1, le=200),
    periodo_aplicado=Depends(periodo_query),
) -> list[dict[str, Any]]:
    _ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    rows = listar_contratacoes_escopo(
        db,
        escopo_uasgs=escopo,
        q=q,
        codigo_uasg=codigo_uasg,
        limit=limit,
        periodo=periodo_aplicado,
    )
    out: list[dict[str, Any]] = []
    for c in rows:
        n_itens = (
            db.scalar(
                select(func.count())
                .select_from(ItemContratacao)
                .where(ItemContratacao.contratacao_id == c.id)
            )
            or 0
        )
        out.append(
            {
                "id": c.id,
                "id_compra": c.id_compra,
                "unidade_compradora": c.unidade_compradora,
                "unidade_nome": c.unidade_nome,
                "ano": c.ano,
                "numero": c.numero,
                "numero_controle_pncp": c.numero_controle_pncp,
                "modalidade_descricao": c.modalidade_descricao,
                "objeto": c.objeto,
                "situacao": c.situacao,
                "valor_total_estimado": c.valor_total_estimado,
                "valor_total_homologado": c.valor_total_homologado,
                "data_publicacao_pncp": c.data_publicacao_pncp,
                "link_pncp": c.link_pncp,
                "total_itens": int(n_itens),
            }
        )
    return out


@router.get("/vencedores-cnpj/filtros")
def filtros_vencedores_cnpj(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    return vencedores_svc.listar_filtros_vencedores(db, escopo_uasgs=escopo)


@router.get("/vencedores-cnpj")
def listar_vencedores_cnpj(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    q: str | None = Query(None, max_length=200),
    status: str | None = Query(
        None,
        description="Cache: atualizado | vencido | pendente | cpf | invalido",
    ),
    porte: str | None = Query(None, max_length=80),
    uf: str | None = Query(None, min_length=2, max_length=2),
    codigo_uasg: str | None = Query(None, max_length=10),
    modalidade_codigo: list[str] | None = Query(None),
    page: int = Query(1, ge=1, description="Página 1-based (padrão Compras.gov)."),
    page_size: int | None = Query(
        None, ge=1, le=100, description="Tamanho da página (default 50, máx. 100)."
    ),
    limit: int | None = Query(
        None, ge=1, le=100, description="Alias legado de page_size."
    ),
    offset: int | None = Query(None, ge=0, description="Alias legado; preferir page."),
    sort: str | None = Query(
        None,
        max_length=40,
        description=(
            "Coluna (whitelist UI): nome|ni|itens|compras|valor|municipio|atualizacao. "
            "Ausente = status cache → nome."
        ),
    ),
    sort_dir: str | None = Query(
        None,
        max_length=4,
        description="asc|desc (default asc quando sort informado).",
    ),
    periodo_aplicado: PeriodoAplicado = Depends(periodo_query),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    size = page_size or limit or 50
    return vencedores_svc.listar_vencedores(
        db,
        escopo_uasgs=escopo,
        periodo=periodo_aplicado,
        q=q,
        status=status,
        porte=porte,
        uf=uf,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigo,
        page=page if offset is None else None,
        page_size=size,
        limit=size,
        offset=offset or 0,
        sort=sort,
        sort_dir=sort_dir,
    )


@router.get("/vencedores-cnpj/{ni}/homologacoes")
def homologacoes_vencedor_cnpj(
    ni: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    codigo_uasg: str | None = Query(None, max_length=10),
    modalidade_codigo: list[str] | None = Query(None),
    uf: str | None = Query(None, min_length=2, max_length=2),
    limit: int = Query(2000, ge=1, le=5000),
    periodo_aplicado: PeriodoAplicado = Depends(periodo_query),
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    try:
        return vencedores_svc.listar_homologacoes(
            db,
            ni,
            escopo_uasgs=escopo,
            periodo=periodo_aplicado,
            codigo_uasg=codigo_uasg,
            modalidade_codigos=modalidade_codigo,
            uf=uf,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/vencedores-cnpj/{ni}")
def detalhe_vencedor_cnpj(
    ni: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx, _escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    try:
        return vencedores_svc.detalhe_vencedor(db, ni)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
