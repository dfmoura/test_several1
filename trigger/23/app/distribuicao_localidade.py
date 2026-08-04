"""Distribuição geográfica de vencedores — mapa de calor por UF e município.

Fonte: resultados homologados (07.3) × fornecedores enriquecidos (UF/município/IBGE).
O eixo geográfico é a sede do fornecedor vencedor — não a UASG compradora
(quase sempre Uberlândia).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.compras.porte import (
    PORTE_NAO_INFORMADO,
    brutos_equivalentes,
    catalogar_portes,
    chave_porte,
    ids_porte,
    rotulo_porte,
)
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
from app.filtros_periodo import (
    TipoPeriodo,
    anos_disponiveis,
    condicao_periodo,
    data_iso_pncp,
    resolver_periodo,
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

# Ordem analítica: do menor porte ao maior, com “não informado” por último
_PORTE_ORDEM = {
    "MEI": 0,
    "MICROEMPRESA": 1,
    "EMPRESADEPEQUENOPORTE": 2,
    "DEMAIS": 3,
    PORTE_NAO_INFORMADO: 9,
}


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


def _porte_chave_rotulo(forn_porte_nome: str | None, forn_porte_id: int | None) -> tuple[str, str]:
    """Chave/rótulo canônicos; sem informação → _vazio_ / Não informado."""
    chave = chave_porte(forn_porte_nome, porte_id=forn_porte_id)
    if not chave:
        return PORTE_NAO_INFORMADO, "Não informado"
    rotulo = rotulo_porte(forn_porte_nome, chave=chave, porte_id=forn_porte_id)
    return chave, rotulo or chave


def _agg_porte_vazio() -> dict[str, Any]:
    return {
        **_agg_vazio(),
        "udi": _agg_vazio(),
        "fora": _agg_vazio(),
    }


def _fechar_porte_bucket(
    chave: str,
    rotulo: str,
    raw: dict[str, Any],
    *,
    total_q: int,
    total_v: float,
) -> dict[str, Any]:
    closed = _fechar_agg(raw)
    q = closed["quantidade"] or 0
    v = float(closed["valor"] or 0)
    forn = closed["fornecedores"] or 0
    return {
        "id": chave,
        "nome": rotulo,
        **closed,
        "pct_quantidade": round(100 * q / total_q, 1) if total_q else 0.0,
        "pct_valor": round(100 * v / total_v, 1) if total_v else 0.0,
        "ticket_medio_item": round(v / q, 2) if q else 0.0,
        "ticket_medio_fornecedor": round(v / forn, 2) if forn else 0.0,
        "uberlandia": _fechar_agg(raw.get("udi") or _agg_vazio()),
        "fora": _fechar_agg(raw.get("fora") or _agg_vazio()),
    }


@router.get("/api/distribuicao-localidade/filtros")
def filtros_distribuicao(db: Session = Depends(get_db)):
    anos = anos_disponiveis(
        db, data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp)
    )
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

    portes = db.scalars(
        select(ComprasFornecedor.porte_empresa_nome)
        .where(
            ComprasFornecedor.porte_empresa_nome.isnot(None),
            ComprasFornecedor.porte_empresa_nome != "",
        )
        .distinct()
        .order_by(ComprasFornecedor.porte_empresa_nome)
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
        "portes": catalogar_portes(portes),
    }


@router.get("/api/distribuicao-localidade/stats")
def stats_distribuicao(
    db: Session = Depends(get_db),
    ano: int | None = Query(None, ge=2000, le=2100),
    periodo: TipoPeriodo | None = None,
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
    uf: str | None = Query(None, min_length=2, max_length=2),
    porte: str | None = Query(
        None,
        description=(
            "Porte canônico (ex.: MICROEMPRESA) ou grafia bruta; "
            "_vazio_ para sem porte informado. Variantes tipográficas são unificadas."
        ),
    ),
    escopo: Escopo = Query("todos"),
    metrica: Metrica = Query("quantidade"),
):
    """Agrega resultados homologados pela localidade do fornecedor vencedor."""
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
    ids_mod = [int(v) for v in modalidade_id if v is not None]
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, ids_mod)
    uf_filtro = (uf or "").strip().upper() or None
    porte_filtro = (porte or "").strip() or None
    if porte_filtro in ("todos", "all", ""):
        porte_filtro = None

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
            ComprasFornecedor.porte_empresa_nome,
            ComprasFornecedor.porte_empresa_id,
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
    filtro_periodo = condicao_periodo(
        data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp),
        periodo_resolvido,
    )
    if filtro_periodo is not None:
        crit.append(filtro_periodo)
    elif ano:
        crit.append(CompraContratacao.ano == ano)
    if chaves_org:
        crit.append(CompraContratacao.unidade_compradora.in_(chaves_org))
    if chaves_mod:
        crit.append(CompraContratacao.modalidade_codigo.in_(chaves_mod))
    if uf_filtro:
        crit.append(ComprasFornecedor.uf_sigla == uf_filtro)
    if porte_filtro == PORTE_NAO_INFORMADO:
        crit.append(
            (ComprasFornecedor.porte_empresa_nome.is_(None))
            | (ComprasFornecedor.porte_empresa_nome == "")
        )
    elif porte_filtro:
        portes_brutos = db.scalars(
            select(ComprasFornecedor.porte_empresa_nome)
            .where(
                ComprasFornecedor.porte_empresa_nome.isnot(None),
                ComprasFornecedor.porte_empresa_nome != "",
            )
            .distinct()
        ).all()
        equivalentes = brutos_equivalentes(porte_filtro, portes_brutos)
        chave = chave_porte(porte_filtro)
        ids = list(ids_porte(chave))
        conds: list[Any] = []
        if equivalentes:
            conds.append(ComprasFornecedor.porte_empresa_nome.in_(equivalentes))
        if ids:
            conds.append(ComprasFornecedor.porte_empresa_id.in_(ids))
        if conds:
            crit.append(or_(*conds))
        else:
            # Filtro sem correspondência na base → resultado vazio
            crit.append(ComprasFornecedor.id == -1)
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
    por_porte: dict[str, dict[str, Any]] = defaultdict(_agg_porte_vazio)
    porte_rotulos: dict[str, str] = {}
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
        porte_nome,
        porte_id,
    ) in rows:
        uf_s = (uf_sigla or "").strip().upper()
        if not uf_s:
            continue
        mun = _norm_municipio(mun_nome)
        key_mun = _chave_municipio(uf_s, mun_nome, ibge)
        valor = _parse_valor(valor_raw) or Decimal(0)
        porte_chave, porte_label = _porte_chave_rotulo(porte_nome, porte_id)
        porte_rotulos[porte_chave] = porte_label

        for bucket in (total, por_uf[uf_s], por_mun[key_mun], por_porte[porte_chave]):
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

        escopo_bucket = por_porte[porte_chave]["udi" if de_udi else "fora"]
        escopo_bucket["quantidade"] += 1
        escopo_bucket["valor"] += valor
        escopo_bucket["contratacoes"].add(cid)
        escopo_bucket["fornecedores"].add(fid)

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

    por_porte_out = [
        _fechar_porte_bucket(
            chave,
            porte_rotulos.get(chave, chave),
            raw,
            total_q=tq,
            total_v=tv,
        )
        for chave, raw in por_porte.items()
    ]
    por_porte_out.sort(
        key=lambda x: (
            _PORTE_ORDEM.get(x["id"], 5),
            -(x["valor"] if metrica == "valor" else x["quantidade"]),
            x["nome"],
        )
    )

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

    porte_rotulo = None
    if porte_filtro == PORTE_NAO_INFORMADO:
        porte_rotulo = "Não informado"
    elif porte_filtro:
        porte_rotulo = rotulo_porte(porte_filtro) or porte_filtro
        porte_filtro = chave_porte(porte_filtro) or porte_filtro

    return {
        "filtros": {
            "ano": ano,
            "periodo": periodo,
            "quadrimestre": quadrimestre,
            "data_inicial": data_inicial,
            "data_final": data_final,
            "orgao_id": orgao_id,
            "orgao_nome": orgao_nome,
            "modalidade_id": ids_mod or None,
            "modalidade_nome": mod_nome,
            "uf": uf_filtro,
            "porte": porte_filtro,
            "porte_nome": porte_rotulo,
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
        "por_porte": por_porte_out,
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
            "porte": (
                "Porte canônico do fornecedor vencedor (Compras.gov / CNPJ), "
                "unificando grafias equivalentes (ex.: ME ≡ Microempresa)."
            ),
        },
    }
