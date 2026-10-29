"""API Compras — sync 07 e consultas por escopo do login."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import require_login
from app.compras.sync_contratacoes import sincronizar_contratacoes_uasg
from app.consultas.deps import periodo_query
from app.consultas.periodo import PeriodoAplicado
from app.database import (
    Contratacao,
    ItemContratacao,
    ResultadoItem,
    Usuario,
    get_db,
)
from app.escopo import (
    ContextoEscopo,
    codigos_uasg_escopo_usuario,
    eh_visao_filial,
)

router = APIRouter(prefix="/api/compras", tags=["compras"])

_MSG_SO_FILIAL = (
    "Compras.gov está disponível apenas na visão de filial. "
    "Use o filtro de visão ou acesse com um login de filial."
)


def _exigir_visao_filial(ctx: ContextoEscopo) -> None:
    if not eh_visao_filial(ctx):
        raise HTTPException(status_code=403, detail=_MSG_SO_FILIAL)


class SyncBody(BaseModel):
    codigo_uasg: str = Field(..., min_length=1, max_length=10)
    data_inicial: date
    data_final: date
    incluir_itens: bool = True
    incluir_resultados: bool = True


class ResultadoOut(BaseModel):
    id: int
    id_compra_item: str
    sequencial_resultado: int
    ni_fornecedor: str | None
    nome_razao_social_fornecedor: str | None
    quantidade_homologada: str | None
    valor_unitario_homologado: str | None
    valor_total_homologado: str | None
    situacao: str | None
    data_resultado_pncp: str | None


class ItemOut(BaseModel):
    id: int
    id_compra_item: str
    numero_item_pncp: int | None
    descricao_resumida: str | None
    material_ou_servico: str | None = None
    material_ou_servico_nome: str | None
    quantidade: str | None
    valor_unitario_estimado: str | None
    valor_total: str | None
    situacao_compra_item_nome: str | None
    tem_resultado: bool | None
    resultados: list[ResultadoOut] = []


class ContratacaoOut(BaseModel):
    id: int
    id_compra: str
    unidade_compradora: str
    unidade_nome: str | None
    ano: int
    numero: str | None
    numero_controle_pncp: str | None
    modalidade_codigo: str | None = None
    modalidade_descricao: str | None
    processo: str | None = None
    objeto: str | None
    situacao: str | None
    valor_total_estimado: str | None
    valor_total_homologado: str | None
    data_publicacao_pncp: str | None
    link_pncp: str | None
    total_itens: int = 0
    tipos_item: list[str] = []
    # Responsável operacional na filial (não ACL).
    acompanhada_por_mim: bool = False
    responsavel: dict[str, Any] | None = None


class ContratacaoDetalheOut(ContratacaoOut):
    data_abertura_proposta_pncp: str | None = None
    data_encerramento_proposta_pncp: str | None = None
    itens: list[ItemOut] = []


class ContratacoesListaOut(BaseModel):
    """Envelope paginado — ``total`` é o COUNT real dos filtros."""

    items: list[ContratacaoOut]
    total: int
    page: int
    page_size: int
    limit: int  # alias de page_size (compat)
    periodo: dict[str, Any]


def _tipos_por_compra(db: Session, ids_compra: list[str]) -> dict[str, list[str]]:
    if not ids_compra:
        return {}
    out: dict[str, set[str]] = {}
    for id_compra, tipo in db.execute(
        select(ItemContratacao.id_compra, ItemContratacao.material_ou_servico).where(
            ItemContratacao.id_compra.in_(ids_compra),
            ItemContratacao.material_ou_servico.is_not(None),
            ItemContratacao.material_ou_servico != "",
        )
    ).all():
        if not id_compra or not tipo:
            continue
        t = str(tipo).strip().upper()
        if t not in ("M", "S"):
            continue
        out.setdefault(str(id_compra), set()).add(t)
    return {k: sorted(v) for k, v in out.items()}


def _filial_id_ctx(ctx) -> int | None:
    if ctx.unidade_contexto is not None and ctx.unidade_contexto.tipo == "filial":
        return int(ctx.unidade_contexto.id)
    if ctx.ids_filiais and len(ctx.ids_filiais) == 1:
        return int(ctx.ids_filiais[0])
    return None


def _contratacao_out(
    c: Contratacao,
    *,
    total_itens: int,
    tipos: list[str] | None = None,
    acompanhada_por_mim: bool = False,
    responsavel: dict[str, Any] | None = None,
) -> ContratacaoOut:
    return ContratacaoOut(
        id=c.id,
        id_compra=c.id_compra,
        unidade_compradora=c.unidade_compradora,
        unidade_nome=c.unidade_nome,
        ano=c.ano,
        numero=c.numero,
        numero_controle_pncp=c.numero_controle_pncp,
        modalidade_codigo=c.modalidade_codigo,
        modalidade_descricao=c.modalidade_descricao,
        processo=c.processo,
        objeto=c.objeto,
        situacao=c.situacao,
        valor_total_estimado=c.valor_total_estimado,
        valor_total_homologado=c.valor_total_homologado,
        data_publicacao_pncp=c.data_publicacao_pncp,
        link_pncp=c.link_pncp,
        total_itens=total_itens,
        tipos_item=tipos or [],
        acompanhada_por_mim=bool(acompanhada_por_mim),
        responsavel=responsavel,
    )


@router.post("/sync")
def sync_uasg(
    body: SyncBody,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Sincroniza módulo 07 para uma UASG (HTTP real). Uso operacional / admin."""
    _ = user
    try:
        return sincronizar_contratacoes_uasg(
            db,
            codigo_uasg=body.codigo_uasg,
            data_inicial=body.data_inicial,
            data_final=body.data_final,
            incluir_itens=body.incluir_itens,
            incluir_resultados=body.incluir_resultados,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/filtros")
def filtros_compras(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Facetas para popular selects da tela Compras.gov (escopo do login)."""
    # Import local: evita ciclo compras ↔ consultas ↔ enriquecimento.
    from app.consultas.service import facetas_contratacoes_escopo

    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    return facetas_contratacoes_escopo(db, escopo_uasgs=escopo)


@router.get("/contratacoes")
def listar_contratacoes(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    q: str | None = Query(None, max_length=200),
    codigo_uasg: str | None = Query(None, max_length=10),
    situacao: str | None = Query(None, max_length=200),
    modalidade_codigo: list[str] | None = Query(
        None, description="Códigos de modalidade (repetir param)."
    ),
    processo: str | None = Query(None, max_length=80),
    numero: str | None = Query(None, max_length=40),
    material_ou_servico: str | None = Query(
        None, max_length=1, description="M = material, S = serviço"
    ),
    page: int = Query(1, ge=1, description="Página 1-based."),
    page_size: int | None = Query(
        None, ge=1, le=100, description="Tamanho da página (default 50, máx. 100)."
    ),
    limit: int | None = Query(
        None,
        ge=1,
        le=100,
        description="Alias legado de page_size (preferir page_size).",
    ),
    sort: str | None = Query(
        None,
        max_length=40,
        description=(
            "Coluna (whitelist UI): numero|processo|uasg|ano|situacao|"
            "valor_est|valor_hom|pncp|tipo. Ausente = id DESC."
        ),
    ),
    sort_dir: str | None = Query(
        None,
        max_length=4,
        description="asc|desc (default asc quando sort informado).",
    ),
    acompanhamento: str | None = Query(
        None,
        max_length=12,
        description=(
            "minhas|sem (pessoal) · com|sem_resp (cobertura filial) · todas (default)."
        ),
    ),
    periodo_aplicado: PeriodoAplicado = Depends(periodo_query),
) -> ContratacoesListaOut:
    # Import local: evita ciclo compras ↔ consultas ↔ enriquecimento.
    from app.acompanhamento.service import mapa_acompanhadas, mapa_responsaveis
    from app.consultas.service import (
        contar_contratacoes_escopo,
        listar_contratacoes_escopo,
    )

    size = page_size or limit or 50
    size = max(1, min(100, int(size)))
    page_n = max(1, int(page or 1))
    offset = (page_n - 1) * size

    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    modo_acomp = (acompanhamento or "").strip().lower() or None
    if modo_acomp in ("", "todas", "all"):
        modo_acomp = None
    if modo_acomp and modo_acomp not in ("minhas", "sem", "com", "sem_resp"):
        raise HTTPException(
            status_code=400,
            detail=(
                "acompanhamento inválido. Use: minhas, sem, com, sem_resp ou todas."
            ),
        )
    filial_ids: list[int] | None = None
    if modo_acomp in ("com", "sem_resp"):
        if ctx.unidade_contexto is not None and ctx.unidade_contexto.tipo == "filial":
            filial_ids = [int(ctx.unidade_contexto.id)]
        elif ctx.ids_filiais:
            filial_ids = [int(x) for x in ctx.ids_filiais]
        else:
            filial_ids = []
    filt = dict(
        escopo_uasgs=escopo,
        q=q,
        codigo_uasg=codigo_uasg,
        situacao=situacao,
        modalidade_codigos=modalidade_codigo,
        processo=processo,
        numero=numero,
        material_ou_servico=material_ou_servico,
        periodo=periodo_aplicado,
        acompanhamento=modo_acomp,
        acompanhamento_usuario_id=(
            user.id if modo_acomp in ("minhas", "sem") else None
        ),
        acompanhamento_unidade_ids=filial_ids,
    )
    total = contar_contratacoes_escopo(db, **filt)
    if total == 0:
        return ContratacoesListaOut(
            items=[],
            total=0,
            page=page_n,
            page_size=size,
            limit=size,
            periodo=periodo_aplicado.to_dict(),
        )
    # Se a página pedida passou do fim, ajusta para a última válida.
    max_page = max(1, (total + size - 1) // size)
    if page_n > max_page:
        page_n = max_page
        offset = (page_n - 1) * size

    rows = listar_contratacoes_escopo(
        db,
        **filt,
        limit=size,
        offset=offset,
        sort=sort,
        sort_dir=sort_dir,
    )
    tipos_map = _tipos_por_compra(db, [c.id_compra for c in rows])
    filial_id = _filial_id_ctx(ctx)
    cids = [c.id for c in rows]
    flags = mapa_acompanhadas(
        db,
        usuario_id=user.id,
        contratacao_ids=cids,
        unidade_id=filial_id,
    )
    responsaveis = mapa_responsaveis(
        db, contratacao_ids=cids, unidade_id=filial_id
    )
    out: list[ContratacaoOut] = []
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
            _contratacao_out(
                c,
                total_itens=int(n_itens),
                tipos=tipos_map.get(c.id_compra, []),
                acompanhada_por_mim=flags.get(c.id, False),
                responsavel=responsaveis.get(c.id),
            )
        )
    return ContratacoesListaOut(
        items=out,
        total=total,
        page=page_n,
        page_size=size,
        limit=size,
        periodo=periodo_aplicado.to_dict(),
    )


@router.get("/contratacoes/{contratacao_id}", response_model=ContratacaoDetalheOut)
def detalhe_contratacao(
    contratacao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> ContratacaoDetalheOut:
    c = db.scalar(
        select(Contratacao)
        .where(Contratacao.id == contratacao_id)
        .options(
            joinedload(Contratacao.itens).joinedload(ItemContratacao.resultados)
        )
    )
    if c is None:
        raise HTTPException(status_code=404, detail="Contratação não encontrada.")

    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    _exigir_visao_filial(ctx)
    if escopo is not None and c.unidade_compradora not in escopo:
        raise HTTPException(status_code=403, detail="Fora do escopo do seu usuário.")

    itens_out: list[ItemOut] = []
    tipos: set[str] = set()
    for it in c.itens or []:
        if it.material_ou_servico:
            t = str(it.material_ou_servico).strip().upper()
            if t in ("M", "S"):
                tipos.add(t)
        itens_out.append(
            ItemOut(
                id=it.id,
                id_compra_item=it.id_compra_item,
                numero_item_pncp=it.numero_item_pncp,
                descricao_resumida=it.descricao_resumida,
                material_ou_servico=it.material_ou_servico,
                material_ou_servico_nome=it.material_ou_servico_nome,
                quantidade=it.quantidade,
                valor_unitario_estimado=it.valor_unitario_estimado,
                valor_total=it.valor_total,
                situacao_compra_item_nome=it.situacao_compra_item_nome,
                tem_resultado=it.tem_resultado,
                resultados=[
                    ResultadoOut(
                        id=r.id,
                        id_compra_item=r.id_compra_item,
                        sequencial_resultado=r.sequencial_resultado,
                        ni_fornecedor=r.ni_fornecedor,
                        nome_razao_social_fornecedor=r.nome_razao_social_fornecedor,
                        quantidade_homologada=r.quantidade_homologada,
                        valor_unitario_homologado=r.valor_unitario_homologado,
                        valor_total_homologado=r.valor_total_homologado,
                        situacao=r.situacao,
                        data_resultado_pncp=r.data_resultado_pncp,
                    )
                    for r in (it.resultados or [])
                ],
            )
        )

    from app.acompanhamento.service import (
        esta_acompanhada,
        responsavel_da_contratacao,
    )

    filial_id = _filial_id_ctx(ctx)
    resp = responsavel_da_contratacao(
        db, contratacao_id=c.id, unidade_id=filial_id
    )
    base = _contratacao_out(
        c,
        total_itens=len(itens_out),
        tipos=sorted(tipos),
        acompanhada_por_mim=esta_acompanhada(
            db,
            usuario_id=user.id,
            contratacao_id=c.id,
            unidade_id=filial_id,
        ),
        responsavel=resp,
    )
    return ContratacaoDetalheOut(
        **base.model_dump(),
        data_abertura_proposta_pncp=c.data_abertura_proposta_pncp,
        data_encerramento_proposta_pncp=c.data_encerramento_proposta_pncp,
        itens=itens_out,
    )


@router.get("/resumo")
def resumo(
    request: Request,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    ctx, escopo = codigos_uasg_escopo_usuario(request, db, user)
    q_c = select(func.count()).select_from(Contratacao)
    q_i = select(func.count()).select_from(ItemContratacao)
    q_r = select(func.count()).select_from(ResultadoItem)
    if escopo is not None:
        if not escopo:
            return {
                "unidade_id": ctx.unidade_contexto.id if ctx.unidade_contexto else None,
                "escopo_modo": ctx.modo,
                "escopo_rotulo": ctx.rotulo,
                "contratacoes": 0,
                "itens": 0,
                "resultados": 0,
                "uasgs_monitoradas": 0,
            }
        q_c = q_c.where(Contratacao.unidade_compradora.in_(escopo))
        q_i = q_i.where(
            ItemContratacao.id_compra.in_(
                select(Contratacao.id_compra).where(
                    Contratacao.unidade_compradora.in_(escopo)
                )
            )
        )
        q_r = q_r.where(
            ResultadoItem.id_compra.in_(
                select(Contratacao.id_compra).where(
                    Contratacao.unidade_compradora.in_(escopo)
                )
            )
        )
    return {
        "unidade_id": ctx.unidade_contexto.id if ctx.unidade_contexto else None,
        "escopo_modo": ctx.modo,
        "escopo_rotulo": ctx.rotulo,
        "contratacoes": int(db.scalar(q_c) or 0),
        "itens": int(db.scalar(q_i) or 0),
        "resultados": int(db.scalar(q_r) or 0),
        "uasgs_monitoradas": len(escopo) if escopo is not None else None,
    }
