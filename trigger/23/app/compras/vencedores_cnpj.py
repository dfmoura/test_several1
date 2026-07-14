"""Consolidação de fornecedores vencedores + status do cache CNPJ.

Fonte canônica: ``compras_contratacao_resultados`` (módulo 07.3).
Fallback seguro: ``compras_contratacao_itens`` apenas para itens que ainda
não possuem linha de resultado (coleta 07-resultados pendente/parcial).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compras.cnpj_publico import cache_cnpj_valido
from app.compras.normalizers import normalizar_ni
from app.config import CNPJ_PUBLICO_CACHE_DIAS
from app.database import CompraContratacaoItem, ComprasContratacaoResultado, ComprasFornecedor

StatusCache = Literal["atualizado", "vencido", "pendente", "cpf", "invalido"]


def _status_cache(row: ComprasFornecedor | None, *, ni: str) -> StatusCache:
    if len(ni) <= 11:
        return "cpf"
    if len(ni) != 14:
        return "invalido"
    if row is None:
        return "pendente"
    if not row.cnpj_enriquecido_em or not row.cnpj_dados_json:
        return "pendente"
    if cache_cnpj_valido(row):
        return "atualizado"
    return "vencido"


def _fmt_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _bucket_vazio(ni: str, nome: str | None) -> dict[str, Any]:
    return {
        "cod_fornecedor": ni,
        "nome_fornecedor": (str(nome).strip() if nome else None) or None,
        "itens": 0,
        "compras": set(),
        "fontes": set(),  # "resultados" | "itens"
    }


def _acumular(
    agg: dict[str, dict[str, Any]],
    *,
    ni: str,
    nome: str | None,
    id_compra: str | None,
    fonte: str,
) -> None:
    bucket = agg.get(ni)
    if bucket is None:
        bucket = _bucket_vazio(ni, nome)
        agg[ni] = bucket
    bucket["itens"] += 1
    bucket["fontes"].add(fonte)
    if id_compra:
        bucket["compras"].add(str(id_compra))
    if nome and (not bucket["nome_fornecedor"] or len(str(nome)) > len(bucket["nome_fornecedor"])):
        bucket["nome_fornecedor"] = str(nome).strip()


def _agregar_vencedores(db: Session) -> dict[str, dict[str, Any]]:
    """
    Agrega NIs vencedores.

    1) Todos os resultados homologados (07.3).
    2) Itens com cod_fornecedor cujo id_compra_item ainda não tem resultado
       (fallback — não duplica item já coberto por 07.3).
    """
    agg: dict[str, dict[str, Any]] = {}

    itens_com_resultado: set[str] = set()
    for id_item, ni_raw, nome, id_compra in db.execute(
        select(
            ComprasContratacaoResultado.id_compra_item,
            ComprasContratacaoResultado.ni_fornecedor,
            ComprasContratacaoResultado.nome_razao_social_fornecedor,
            ComprasContratacaoResultado.id_compra,
        ).where(
            ComprasContratacaoResultado.ni_fornecedor.isnot(None),
            ComprasContratacaoResultado.ni_fornecedor != "",
        )
    ).all():
        ni = normalizar_ni(ni_raw)
        if not ni:
            continue
        if id_item:
            itens_com_resultado.add(str(id_item))
        _acumular(
            agg,
            ni=ni,
            nome=nome,
            id_compra=id_compra,
            fonte="resultados",
        )

    for id_item, cod, nome, id_compra in db.execute(
        select(
            CompraContratacaoItem.id_compra_item,
            CompraContratacaoItem.cod_fornecedor,
            CompraContratacaoItem.nome_fornecedor,
            CompraContratacaoItem.id_compra,
        ).where(
            CompraContratacaoItem.cod_fornecedor.isnot(None),
            CompraContratacaoItem.cod_fornecedor != "",
        )
    ).all():
        # Já coberto pelo fato 07.3 — não usar atalho do item.
        if id_item and str(id_item) in itens_com_resultado:
            continue
        ni = normalizar_ni(cod)
        if not ni:
            continue
        _acumular(
            agg,
            ni=ni,
            nome=nome,
            id_compra=id_compra,
            fonte="itens",
        )

    return agg


def listar_vencedores_consolidados(
    db: Session,
    *,
    q: str | None = None,
    status: str | None = None,
    limit: int = 500,
) -> dict[str, Any]:
    """
    Consolida vencedores (07.3 + fallback itens) e cruza com ``compras_fornecedores``.

    Contrato da API/UI permanece estável (mesmos campos públicos).
    """
    agg = _agregar_vencedores(db)

    if not agg:
        return {
            "items": [],
            "total": 0,
            "resumo": {
                "atualizado": 0,
                "vencido": 0,
                "pendente": 0,
                "cpf": 0,
                "invalido": 0,
            },
            "cache_dias": CNPJ_PUBLICO_CACHE_DIAS,
            "fonte_canonica": "compras_contratacao_resultados",
        }

    fornecedores = {
        r.ni_fornecedor: r
        for r in db.scalars(
            select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor.in_(list(agg.keys())))
        ).all()
    }

    q_norm = (q or "").strip().lower()
    q_digits = "".join(c for c in (q or "") if c.isdigit())
    status_filtro = (status or "").strip().lower() or None
    if status_filtro in ("todos", "all", ""):
        status_filtro = None

    items: list[dict[str, Any]] = []
    resumo = {"atualizado": 0, "vencido": 0, "pendente": 0, "cpf": 0, "invalido": 0}

    for ni, bucket in agg.items():
        forn = fornecedores.get(ni)
        st = _status_cache(forn, ni=ni)
        resumo[st] = resumo.get(st, 0) + 1

        nome = bucket["nome_fornecedor"] or (forn.nome_razao_social_fornecedor if forn else None)
        if q_norm:
            nome_l = (nome or "").lower()
            if q_norm not in nome_l and q_digits not in ni:
                continue
        if status_filtro and st != status_filtro:
            continue

        fontes = bucket["fontes"]
        if fontes == {"resultados"}:
            fonte_agg = "resultados"
        elif fontes == {"itens"}:
            fonte_agg = "itens"
        else:
            fonte_agg = "misto"

        limite = datetime.utcnow() - timedelta(days=CNPJ_PUBLICO_CACHE_DIAS)
        enriquecido_em = forn.cnpj_enriquecido_em if forn else None
        items.append(
            {
                "cod_fornecedor": ni,
                "nome_fornecedor": nome,
                "tipo": "cpf" if len(ni) <= 11 else "cnpj",
                "qtd_itens": bucket["itens"],
                "qtd_compras": len(bucket["compras"]),
                "status_cache": st,
                "cache_valido": st == "atualizado",
                "cnpj_enriquecido_em": _fmt_iso(enriquecido_em),
                "cache_expira_em": _fmt_iso(enriquecido_em + timedelta(days=CNPJ_PUBLICO_CACHE_DIAS))
                if enriquecido_em
                else None,
                "municipio": forn.nome_municipio if forn else None,
                "uf": forn.uf_sigla if forn else None,
                "situacao_cadastral": forn.situacao_cadastral if forn else None,
                "de_uberlandia": forn.de_uberlandia if forn else None,
                "compras_gov_enriquecido_em": _fmt_iso(forn.compras_gov_enriquecido_em)
                if forn and forn.compras_gov_enriquecido_em
                else None,
                "fonte_agregacao": fonte_agg,
                "pode_atualizar": len(ni) == 14,
                "referencia_cache": _fmt_iso(limite),
            }
        )

    items.sort(
        key=lambda r: (
            0 if r["status_cache"] == "vencido" else 1 if r["status_cache"] == "pendente" else 2,
            (r["nome_fornecedor"] or "").upper(),
            r["cod_fornecedor"],
        )
    )
    total = len(items)
    if limit and len(items) > limit:
        items = items[:limit]

    return {
        "items": items,
        "total": total,
        "resumo": resumo,
        "cache_dias": CNPJ_PUBLICO_CACHE_DIAS,
        "fonte_canonica": "compras_contratacao_resultados",
    }


def listar_pendentes_enriquecimento(db: Session) -> list[dict[str, Any]]:
    """CNPJs vencedores com cache pendente (somente 14 dígitos), sem truncar a fila."""
    data = listar_vencedores_consolidados(db, status="pendente", limit=20_000)
    return [
        {
            "cod_fornecedor": r["cod_fornecedor"],
            "nome_fornecedor": r["nome_fornecedor"],
        }
        for r in data["items"]
        if r.get("pode_atualizar") and r.get("cod_fornecedor")
    ]
