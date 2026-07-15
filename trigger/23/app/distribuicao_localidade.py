"""Distribuição geográfica de vencedores — mapa de calor por UF e município.

Fonte: resultados homologados (07.3) × fornecedores enriquecidos (UF/município/IBGE).
O eixo geográfico é a sede do fornecedor vencedor — não a UASG compradora
(quase sempre Uberlândia).
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import (
    CompraContratacao,
    ComprasContratacaoResultado,
    ComprasFornecedor,
    ModalidadeConsolidada,
    ModalidadeVinculo,
    OrgaoConsolidado,
    OrgaoVinculo,
    get_db,
)

router = APIRouter(tags=["distribuicao-localidade"])

Escopo = Literal["todos", "uberlandia", "fora"]
Metrica = Literal["quantidade", "valor"]

_UF_NOMES = {
    "AC": "Acre",
    "AL": "Alagoas",
    "AP": "Amapá",
    "AM": "Amazonas",
    "BA": "Bahia",
    "CE": "Ceará",
    "DF": "Distrito Federal",
    "ES": "Espírito Santo",
    "GO": "Goiás",
    "MA": "Maranhão",
    "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais",
    "PA": "Pará",
    "PB": "Paraíba",
    "PR": "Paraná",
    "PE": "Pernambuco",
    "PI": "Piauí",
    "RJ": "Rio de Janeiro",
    "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul",
    "RO": "Rondônia",
    "RR": "Roraima",
    "SC": "Santa Catarina",
    "SP": "São Paulo",
    "SE": "Sergipe",
    "TO": "Tocantins",
}

_LIMITE_MUNICIPIOS = 400


def _parse_valor(v: str | None) -> Decimal | None:
    if not v:
        return None
    s = v.strip().replace("R$", "").strip()
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _fmt_valor(d: Decimal | None) -> float | None:
    if d is None:
        return None
    return float(d.quantize(Decimal("0.01")))


def _chaves_orgao(db: Session, orgao_id: int | None) -> set[str]:
    if orgao_id is None:
        return set()
    return {
        v.chave
        for v in db.scalars(
            select(OrgaoVinculo).where(
                OrgaoVinculo.orgao_consolidado_id == orgao_id,
                OrgaoVinculo.fonte == "compras_api",
            )
        ).all()
    }


def _chaves_modalidade(db: Session, modalidade_id: int | list[int] | None) -> set[str]:
    ids: list[int]
    if modalidade_id is None:
        return set()
    if isinstance(modalidade_id, int):
        ids = [modalidade_id] if modalidade_id else []
    else:
        ids = [int(v) for v in modalidade_id if v is not None]
    if not ids:
        return set()
    return {
        v.chave
        for v in db.scalars(
            select(ModalidadeVinculo).where(
                ModalidadeVinculo.modalidade_consolidada_id.in_(ids),
                ModalidadeVinculo.fonte == "compras_api",
            )
        ).all()
    }


def _norm_municipio(nome: str | None) -> str:
    return (nome or "").strip().upper() or "NÃO INFORMADO"


def _chave_municipio(
    uf: str,
    nome: str | None,
    ibge: int | None,
) -> tuple[str, str, int | None]:
    """Agrupa pelo IBGE quando houver; evita duplicar o mesmo município por acentuação."""
    mun = _norm_municipio(nome)
    if ibge:
        return (uf, f"IBGE:{ibge}", ibge)
    return (uf, mun, None)


def _agg_vazio() -> dict[str, Any]:
    return {
        "quantidade": 0,
        "valor": Decimal(0),
        "contratacoes": set(),
        "fornecedores": set(),
        "rotulo": "",
    }


def _fechar_agg(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "quantidade": raw["quantidade"],
        "valor": _fmt_valor(raw["valor"] if raw["valor"] else None) or 0.0,
        "contratacoes": len(raw["contratacoes"]),
        "fornecedores": len(raw["fornecedores"]),
    }


@router.get("/api/distribuicao-localidade/filtros")
def filtros_distribuicao(db: Session = Depends(get_db)):
    anos = db.scalars(
        select(CompraContratacao.ano).distinct().order_by(CompraContratacao.ano.desc())
    ).all()
    orgaos = db.scalars(
        select(OrgaoConsolidado)
        .where(OrgaoConsolidado.ativo.is_(True))
        .order_by(OrgaoConsolidado.nome)
    ).all()
    modalidades = db.scalars(
        select(ModalidadeConsolidada)
        .where(ModalidadeConsolidada.ativo.is_(True))
        .order_by(ModalidadeConsolidada.nome)
    ).all()

    ufs = db.scalars(
        select(ComprasFornecedor.uf_sigla)
        .where(
            ComprasFornecedor.uf_sigla.isnot(None),
            ComprasFornecedor.uf_sigla != "",
        )
        .distinct()
        .order_by(ComprasFornecedor.uf_sigla)
    ).all()

    return {
        "anos": list(anos),
        "orgaos": [{"id": o.id, "nome": o.nome, "sigla": o.sigla} for o in orgaos],
        "modalidades": [{"id": m.id, "nome": m.nome} for m in modalidades],
        "ufs": [
            {"sigla": u, "nome": _UF_NOMES.get(u, u)}
            for u in ufs
            if u
        ],
    }


@router.get("/api/distribuicao-localidade/stats")
def stats_distribuicao(
    db: Session = Depends(get_db),
    ano: int | None = Query(None, ge=2000, le=2100),
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
    uf: str | None = Query(None, min_length=2, max_length=2),
    escopo: Escopo = Query("todos"),
    metrica: Metrica = Query("quantidade"),
):
    """Agrega resultados homologados pela localidade do fornecedor vencedor."""
    ids_mod = [int(v) for v in modalidade_id if v is not None]
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, ids_mod)
    uf_filtro = (uf or "").strip().upper() or None

    stmt = (
        select(
            CompraContratacao.id,
            CompraContratacao.ano,
            CompraContratacao.id_compra,
            ComprasContratacaoResultado.valor_total_homologado,
            ComprasFornecedor.id,
            ComprasFornecedor.uf_sigla,
            ComprasFornecedor.nome_municipio,
            ComprasFornecedor.codigo_municipio_ibge,
            ComprasFornecedor.de_uberlandia,
        )
        .select_from(ComprasContratacaoResultado)
        .join(
            ComprasFornecedor,
            ComprasFornecedor.id == ComprasContratacaoResultado.fornecedor_id,
        )
        .join(
            CompraContratacao,
            CompraContratacao.id_compra == ComprasContratacaoResultado.id_compra,
        )
    )

    crit: list[Any] = [
        ComprasFornecedor.uf_sigla.isnot(None),
        ComprasFornecedor.uf_sigla != "",
    ]
    if ano:
        crit.append(CompraContratacao.ano == ano)
    if chaves_org:
        crit.append(CompraContratacao.unidade_compradora.in_(chaves_org))
    if chaves_mod:
        crit.append(CompraContratacao.modalidade_codigo.in_(chaves_mod))
    if uf_filtro:
        crit.append(ComprasFornecedor.uf_sigla == uf_filtro)
    if escopo == "uberlandia":
        crit.append(ComprasFornecedor.de_uberlandia.is_(True))
    elif escopo == "fora":
        crit.append(
            (ComprasFornecedor.de_uberlandia.is_(False))
            | (ComprasFornecedor.de_uberlandia.is_(None))
        )

    rows = db.execute(stmt.where(*crit)).all()

    por_uf: dict[str, dict[str, Any]] = defaultdict(_agg_vazio)
    por_mun: dict[tuple[str, str, int | None], dict[str, Any]] = defaultdict(_agg_vazio)
    mun_meta: dict[tuple[str, str, int | None], bool | None] = {}
    udi = _agg_vazio()
    fora = _agg_vazio()
    total = _agg_vazio()

    for (
        cid,
        _ano,
        _id_compra,
        valor_raw,
        fid,
        uf_sigla,
        mun_nome,
        ibge,
        de_udi,
    ) in rows:
        uf_s = (uf_sigla or "").strip().upper()
        if not uf_s:
            continue
        mun = _norm_municipio(mun_nome)
        key_mun = _chave_municipio(uf_s, mun_nome, ibge)
        valor = _parse_valor(valor_raw) or Decimal(0)

        for bucket in (total, por_uf[uf_s], por_mun[key_mun]):
            bucket["quantidade"] += 1
            bucket["valor"] += valor
            bucket["contratacoes"].add(cid)
            bucket["fornecedores"].add(fid)

        # Preferir rótulo sem acento inconsistente; Uberlândia primeiro se marcado
        if not por_mun[key_mun]["rotulo"] or (de_udi and "UBERL" in mun):
            por_mun[key_mun]["rotulo"] = mun
        if de_udi:
            mun_meta[key_mun] = True
        elif key_mun not in mun_meta:
            mun_meta[key_mun] = de_udi

        alvo = udi if de_udi else fora
        alvo["quantidade"] += 1
        alvo["valor"] += valor
        alvo["contratacoes"].add(cid)
        alvo["fornecedores"].add(fid)

    por_uf_out = []
    for sigla, raw in por_uf.items():
        closed = _fechar_agg(raw)
        mun_count = len({k for k in por_mun if k[0] == sigla})
        por_uf_out.append(
            {
                "uf": sigla,
                "nome": _UF_NOMES.get(sigla, sigla),
                **closed,
                "municipios": mun_count,
            }
        )
    por_uf_out.sort(
        key=lambda x: (-(x["valor"] if metrica == "valor" else x["quantidade"]), x["uf"])
    )

    por_mun_out = []
    for key, raw in por_mun.items():
        sigla, _token, ibge = key
        closed = _fechar_agg(raw)
        rotulo = raw.get("rotulo") or _norm_municipio(None)
        por_mun_out.append(
            {
                "uf": sigla,
                "municipio": rotulo,
                "ibge": ibge,
                "de_uberlandia": bool(mun_meta.get(key)),
                **closed,
            }
        )
    por_mun_out.sort(
        key=lambda x: (-(x["valor"] if metrica == "valor" else x["quantidade"]), x["municipio"])
    )

    total_closed = _fechar_agg(total)
    udi_closed = _fechar_agg(udi)
    fora_closed = _fechar_agg(fora)
    tq = total_closed["quantidade"] or 0
    tv = total_closed["valor"] or 0.0

    orgao_nome = None
    if orgao_id:
        org = db.get(OrgaoConsolidado, orgao_id)
        orgao_nome = (org.sigla or org.nome) if org else None
    mod_nome = None
    if ids_mod:
        mods = db.scalars(
            select(ModalidadeConsolidada)
            .where(ModalidadeConsolidada.id.in_(ids_mod))
            .order_by(ModalidadeConsolidada.nome)
        ).all()
        nomes = [m.nome for m in mods if m and m.nome]
        mod_nome = ", ".join(nomes) if nomes else None

    return {
        "filtros": {
            "ano": ano,
            "orgao_id": orgao_id,
            "orgao_nome": orgao_nome,
            "modalidade_id": ids_mod or None,
            "modalidade_nome": mod_nome,
            "uf": uf_filtro,
            "escopo": escopo,
            "metrica": metrica,
        },
        "resumo": {
            **total_closed,
            "ufs": len(por_uf_out),
            "municipios": len(por_mun_out),
            "uberlandia": {
                **udi_closed,
                "pct_quantidade": round(100 * udi_closed["quantidade"] / tq, 1) if tq else 0.0,
                "pct_valor": round(100 * udi_closed["valor"] / tv, 1) if tv else 0.0,
            },
            "fora": {
                **fora_closed,
                "pct_quantidade": round(100 * fora_closed["quantidade"] / tq, 1) if tq else 0.0,
                "pct_valor": round(100 * fora_closed["valor"] / tv, 1) if tv else 0.0,
            },
        },
        "por_uf": por_uf_out,
        "por_municipio": por_mun_out[:_LIMITE_MUNICIPIOS],
        "por_municipio_total": len(por_mun_out),
        "interpretacao": {
            "eixo": "Localidade do fornecedor vencedor (sede cadastral)",
            "quantidade": (
                "Itens homologados: linhas de resultado do módulo PNCP 07.3 "
                "(por item/vencedor). Não é o número de licitações."
            ),
            "contratacoes": (
                "Contratações/licitações distintas com ao menos um item homologado "
                "nos filtros."
            ),
            "valor": "Soma de valor_total_homologado dos itens/resultados",
        },
    }
