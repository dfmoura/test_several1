"""Cobertura entre bases — o que está em Compras.gov e não no Power BI (e vice-versa).

Reutiliza a mesma chave de cruzamento do painel e da consulta unificada:
  órgão consolidado + ano + número do processo.

Não altera as estatísticas do dashboard; apenas materializa as listas
que o painel já resume em ``somente_esta_base``.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard_gerencial import (
    ChaveProcesso,
    _chave_api,
    _chave_powerbi,
    _chaves_modalidade,
    _chaves_orgao,
    _item_sem_chave_api,
    _item_sem_chave_powerbi,
    _mapa_orgaos,
    _nomes_modalidades,
    _norm_ids,
    _resumo_cruzamento,
    _where_compras,
    _where_pbi,
)
from app.database import CompraContratacao, OrgaoConsolidado, PbiOrgao, PbiProcessoLicitatorio, get_db
from app.filtros_periodo import TipoPeriodo, resolver_periodo

router = APIRouter(tags=["cobertura-bases"])

VistaCobertura = Literal[
    "em_ambas",
    "somente_compras",
    "somente_powerbi",
    "sem_chave_compras",
    "sem_chave_powerbi",
]

_LIMITE_PADRAO = 100
_LIMITE_MAX = 500


def _item_somente_compras(
    row: CompraContratacao,
    chave: ChaveProcesso,
    mapa_org: dict,
) -> dict[str, Any]:
    oid, ano, numero = chave
    org = mapa_org.get(("compras_api", row.unidade_compradora))
    return {
        "id": row.id,
        "fonte": "compras",
        "ano": row.ano,
        "processo": row.processo,
        "processo_numero": numero,
        "numero_compra": row.numero,
        "orgao": row.unidade_nome,
        "orgao_chave": row.unidade_compradora,
        "orgao_consolidado": (org.sigla or org.nome) if org else None,
        "orgao_consolidado_id": oid,
        "modalidade": row.modalidade_descricao,
        "situacao": row.situacao_lista or row.situacao_compra_nome_pncp,
        "valor": row.valor_total_homologado or row.valor_total_estimado,
        "objeto": (row.objeto or "")[:180] or None,
        "chave": {"orgao_id": oid, "ano": ano, "numero": numero},
    }


def _item_somente_powerbi(
    row: PbiProcessoLicitatorio,
    orgao_nome: str,
    chave: ChaveProcesso,
    mapa_org: dict,
) -> dict[str, Any]:
    oid, ano, numero = chave
    org = mapa_org.get(("powerbi", orgao_nome))
    return {
        "id": row.id,
        "fonte": "powerbi",
        "ano": row.ano_processo,
        "processo": row.processo,
        "processo_numero": numero,
        "numero_compra": None,
        "orgao": orgao_nome,
        "orgao_chave": orgao_nome,
        "orgao_consolidado": (org.sigla or org.nome) if org else None,
        "orgao_consolidado_id": oid,
        "modalidade": row.modalidade,
        "situacao": row.situacao,
        "valor": row.valor_licitacao,
        "objeto": (row.objeto or "")[:180] or None,
        "chave": {"orgao_id": oid, "ano": ano, "numero": numero},
    }


def _coletar_cobertura(
    db: Session,
    ano: int | None,
    periodo,
    chaves_org: dict[str, set[str] | None],
    chaves_mod: dict[str, set[str] | None],
    mapa_org: dict,
    *,
    fallback_homologacao: bool = True,
) -> dict[str, Any]:
    """Mesma semântica do cruzamento do painel, com listas materializadas."""
    crit_a = _where_compras(ano, periodo, chaves_org, chaves_mod)
    crit_b = _where_pbi(
        ano, periodo, chaves_org, chaves_mod, fallback_homologacao=fallback_homologacao
    )

    chaves_api: list[ChaveProcesso | None] = []
    set_api: set[ChaveProcesso] = set()
    itens_api: list[tuple[CompraContratacao, ChaveProcesso | None]] = []
    sem_api: list[dict[str, Any]] = []

    for row in db.scalars(select(CompraContratacao).where(*crit_a)).all():
        k = _chave_api(row, mapa_org)
        chaves_api.append(k)
        itens_api.append((row, k))
        if k:
            set_api.add(k)
        else:
            sem_api.append(_item_sem_chave_api(row, mapa_org))

    chaves_pbi: list[ChaveProcesso | None] = []
    set_pbi: set[ChaveProcesso] = set()
    itens_pbi: list[tuple[PbiProcessoLicitatorio, str, ChaveProcesso | None]] = []
    sem_pbi: list[dict[str, Any]] = []

    rows_pbi = db.execute(
        select(PbiProcessoLicitatorio, PbiOrgao.nome)
        .join(PbiOrgao, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
        .where(*crit_b)
    ).all()
    for proc, orgao_nome in rows_pbi:
        k = _chave_powerbi(proc, orgao_nome, mapa_org)
        chaves_pbi.append(k)
        itens_pbi.append((proc, orgao_nome, k))
        if k:
            set_pbi.add(k)
        else:
            sem_pbi.append(_item_sem_chave_powerbi(proc, orgao_nome, mapa_org))

    # Período filtra o que entra na lista; a presença na outra base ignora a data
    # da contraparte (homologação/encerramento podem cair em períodos distintos).
    lookup_api = set_api
    lookup_pbi = set_pbi
    if periodo is not None:
        lookup_api = {
            chave
            for row in db.scalars(
                select(CompraContratacao).where(
                    *_where_compras(None, None, chaves_org, chaves_mod)
                )
            ).all()
            if (chave := _chave_api(row, mapa_org))
        }
        lookup_pbi = {
            chave
            for proc, orgao_nome in db.execute(
                select(PbiProcessoLicitatorio, PbiOrgao.nome)
                .join(PbiOrgao, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
                .where(
                    *_where_pbi(
                        None,
                        None,
                        chaves_org,
                        chaves_mod,
                        fallback_homologacao=fallback_homologacao,
                    )
                )
            ).all()
            if (chave := _chave_powerbi(proc, orgao_nome, mapa_org))
        }

    ra = _resumo_cruzamento(chaves_api, lookup_pbi)
    rb = _resumo_cruzamento(chaves_pbi, lookup_api)

    somente_compras = [
        _item_somente_compras(row, k, mapa_org)
        for row, k in itens_api
        if k and k not in lookup_pbi
    ]
    somente_powerbi = [
        _item_somente_powerbi(proc, orgao_nome, k, mapa_org)
        for proc, orgao_nome, k in itens_pbi
        if k and k not in lookup_api
    ]
    # Registros Compras.gov com chave válida também presente no Power BI
    # (mesma contagem do KPI «Compras.gov também no Power BI»).
    em_ambas = [
        _item_somente_compras(row, k, mapa_org)
        for row, k in itens_api
        if k and k in lookup_pbi
    ]

    # Chaves únicas do Compras.gov (no filtro) que também existem no Power BI.
    chaves_unicas_em_ambas = len({k for k in set_api if k in lookup_pbi})

    return {
        "resumo": {
            "compras": {
                "total_registros": len(chaves_api),
                "com_chave_valida": ra["com_chave_valida"],
                "sem_chave": ra["sem_chave"],
                "em_ambas": ra["em_ambas"],
                "somente_esta_base": ra["somente_esta_base"],
                "chaves_unicas_em_ambas": chaves_unicas_em_ambas,
            },
            "powerbi": {
                "total_registros": len(chaves_pbi),
                "com_chave_valida": rb["com_chave_valida"],
                "sem_chave": rb["sem_chave"],
                "em_ambas": rb["em_ambas"],
                "somente_esta_base": rb["somente_esta_base"],
            },
        },
        "listas": {
            "em_ambas": em_ambas,
            "somente_compras": somente_compras,
            "somente_powerbi": somente_powerbi,
            "sem_chave_compras": sem_api,
            "sem_chave_powerbi": sem_pbi,
        },
    }


def _resolver_filtros(
    db: Session,
    *,
    ano: int | None,
    periodo: TipoPeriodo | None,
    quadrimestre: int | None,
    data_inicial: date | None,
    data_final: date | None,
    fallback_homologacao: bool,
    orgao_id: int | None,
    modalidade_id: list[int],
) -> tuple[Any, dict, dict, dict, dict[str, Any]]:
    try:
        periodo_resolvido = resolver_periodo(
            periodo=periodo,
            ano=ano,
            quadrimestre=quadrimestre,
            data_inicial=data_inicial,
            data_final=data_final,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    ids_mod = _norm_ids(modalidade_id)
    mapa_org = _mapa_orgaos(db)
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, ids_mod)

    orgao_nome = None
    if orgao_id:
        org = db.get(OrgaoConsolidado, orgao_id)
        orgao_nome = org.sigla or org.nome if org else None

    filtros = {
        "ano": ano,
        "periodo": periodo,
        "quadrimestre": quadrimestre,
        "data_inicial": data_inicial,
        "data_final": data_final,
        "fallback_homologacao": fallback_homologacao,
        "orgao_id": orgao_id,
        "orgao_nome": orgao_nome,
        "modalidade_id": ids_mod or None,
        "modalidade_nome": _nomes_modalidades(db, ids_mod),
    }
    return periodo_resolvido, mapa_org, chaves_org, chaves_mod, filtros


def _slice(items: list[dict[str, Any]], *, limit: int, offset: int) -> dict[str, Any]:
    total = len(items)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items[offset : offset + limit],
    }


@router.get("/api/cobertura-bases")
def cobertura_bases(
    db: Session = Depends(get_db),
    ano: int | None = Query(None, ge=2000, le=2100),
    periodo: TipoPeriodo | None = None,
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    fallback_homologacao: bool = Query(True),
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
    vista: VistaCobertura = Query("em_ambas"),
    limit: int = Query(_LIMITE_PADRAO, ge=1, le=_LIMITE_MAX),
    offset: int = Query(0, ge=0),
):
    """Resumo de cobertura + lista paginada da vista selecionada."""
    periodo_resolvido, mapa_org, chaves_org, chaves_mod, filtros = _resolver_filtros(
        db,
        ano=ano,
        periodo=periodo,
        quadrimestre=quadrimestre,
        data_inicial=data_inicial,
        data_final=data_final,
        fallback_homologacao=fallback_homologacao,
        orgao_id=orgao_id,
        modalidade_id=modalidade_id,
    )

    dados = _coletar_cobertura(
        db,
        ano,
        periodo_resolvido,
        chaves_org,
        chaves_mod,
        mapa_org,
        fallback_homologacao=fallback_homologacao,
    )

    lista = dados["listas"].get(vista, [])
    return {
        "filtros": filtros,
        "vista": vista,
        "resumo": dados["resumo"],
        "lista": _slice(lista, limit=limit, offset=offset),
        "interpretacao": {
            "chave": "Órgão consolidado + ano + nº do processo",
            "em_ambas": "Registro no Compras.gov com chave válida também presente no Power BI",
            "somente_compras": "Registro no Compras.gov com chave válida ausente no Power BI",
            "somente_powerbi": "Registro no Power BI com chave válida ausente no Compras.gov",
            "sem_chave": "Não entra no cruzamento (órgão sem vínculo ou processo não interpretável)",
            "periodo": (
                "O período filtra os registros listados; a presença na outra base "
                "é verificada sem limitar a data da contraparte."
            ),
        },
    }
