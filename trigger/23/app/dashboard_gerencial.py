"""Dashboard gerencial — visão consolidada Compras.gov (PNCP) e Power BI (PMU)."""

from __future__ import annotations

import re
from collections import Counter
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    ModalidadeConsolidada,
    ModalidadeVinculo,
    OrgaoConsolidado,
    OrgaoVinculo,
    PbiOrgao,
    PbiProcessoLicitatorio,
    get_db,
)

router = APIRouter(tags=["dashboard-gerencial"])

_SEM_VINCULO = "Sem vínculo"
_SEM_ITENS = "Sem itens coletados"


def _norm_ids(valor: int | list[int] | None) -> list[int]:
    """Normaliza um ou mais IDs vindos da query (compatível com valor único legado)."""
    if valor is None:
        return []
    if isinstance(valor, int):
        return [valor] if valor else []
    return [int(v) for v in valor if v is not None]


def _nomes_modalidades(db: Session, ids: list[int]) -> str | None:
    if not ids:
        return None
    rows = db.scalars(
        select(ModalidadeConsolidada)
        .where(ModalidadeConsolidada.id.in_(ids))
        .order_by(ModalidadeConsolidada.nome)
    ).all()
    nomes = [m.nome for m in rows if m and m.nome]
    return ", ".join(nomes) if nomes else None

# Desempate quando uma contratação tem itens com situações distintas (maioria primeiro).
_SITUACAO_ITEM_PRIORIDADE = (
    "Homologado",
    "Em andamento",
    "Deserto",
    "Fracassado",
    "Anulado/Revogado/Cancelado",
)


def _consolidar_situacao_itens(situacoes: list[str]) -> str:
    """Uma situação por contratação — maioria entre itens; empate por prioridade."""
    if not situacoes:
        return _SEM_ITENS
    if len(situacoes) == 1:
        return situacoes[0]
    counts = Counter(situacoes)
    max_count = max(counts.values())
    candidatos = [s for s, c in counts.items() if c == max_count]
    if len(candidatos) == 1:
        return candidatos[0]
    for pref in _SITUACAO_ITEM_PRIORIDADE:
        if pref in candidatos:
            return pref
    return sorted(candidatos)[0]


def _join_itens_compras():
    return or_(
        CompraContratacaoItem.contratacao_id == CompraContratacao.id,
        CompraContratacaoItem.id_compra == CompraContratacao.id_compra,
    )


def _por_situacao_api_itens(db: Session, crit: list[Any]) -> list[tuple[str | None, int]]:
    """Situação consolidada por contratação a partir dos itens (1 contrato = 1 situação)."""
    rows = db.execute(
        select(
            CompraContratacao.id,
            CompraContratacaoItem.situacao_compra_item_nome,
            CompraContratacao.situacao_lista,
            CompraContratacao.situacao_compra_nome_pncp,
        )
        .select_from(CompraContratacao)
        .outerjoin(CompraContratacaoItem, _join_itens_compras())
        .where(*crit)
    ).all()

    por_contrato: dict[int, dict[str, Any]] = {}
    for cid, sit_item, sit_lista, sit_pncp in rows:
        if cid not in por_contrato:
            por_contrato[cid] = {"itens": [], "fallback": sit_lista or sit_pncp}
        if sit_item and sit_item.strip():
            por_contrato[cid]["itens"].append(sit_item.strip())

    buckets: dict[str, int] = {}
    for info in por_contrato.values():
        if info["itens"]:
            label = _consolidar_situacao_itens(info["itens"])
        else:
            label = (info["fallback"] or "").strip() or _SEM_ITENS
        buckets[label] = buckets.get(label, 0) + 1

    return [(nome, total) for nome, total in buckets.items()]


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


def extrair_numero_processo_api(processo: str) -> int | None:
    """Normaliza PROCESSO da API PNCP para cruzamento entre bases.

    Exemplos:
      5302023 → 530; 017/2023 → 17; 6352023 → 635
      25.528 → 25528; 25.793 → 25793; 57.539 → 57539
      279.2025 → 279; 124,2024 → 124
      20.039/2023 → 20039; 20.113/2023 → 20113
      201- Reagentes Quimicos → 201
    """
    p = processo.strip()
    if not p:
        return None

    # 201- Reagentes Quimicos → 201
    m = re.match(r"^(\d+)\s*-", p)
    if m:
        return int(m.group(1))

    # 017/2023, 124,2024, 20.039/2023 → parte numérica antes do ano (ponto = milhar)
    m = re.match(r"^([\d.]+)\s*[,/](\d{4})\b", p)
    if m:
        parte = m.group(1).replace(".", "")
        if parte.isdigit():
            return int(parte)

    # 279.2025 → 279 (ponto seguido de ano com 4 dígitos)
    m = re.match(r"^(\d+)\.(\d{4})$", p)
    if m and 2000 <= int(m.group(2)) <= 2100:
        return int(m.group(1))

    # 25.528, 57.539 → concatena (ponto como separador de milhar)
    m = re.match(r"^(\d+)\.(\d+)$", p)
    if m:
        return int(m.group(1) + m.group(2))

    # 5302023, 6352023 → prefixo antes do ano no final
    if p.isdigit() and len(p) > 4:
        m = re.match(r"^(\d+?)(\d{4})$", p)
        if m and 2000 <= int(m.group(2)) <= 2100:
            return int(m.group(1))

    if p.isdigit():
        return int(p)

    return None


def normalizar_processo_powerbi(processo: str) -> int | None:
    """Power BI: usa o campo PROCESSO como está (numérico)."""
    p = processo.strip()
    if not p or not p.isdigit():
        return None
    return int(p)


ChaveProcesso = tuple[int, int, int]  # orgao_consolidado_id, ano, numero_processo
_LIMITE_SEM_CHAVE_LISTA = 500


def _motivo_sem_chave_api(
    row: CompraContratacao,
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
) -> str:
    motivos: list[str] = []
    if not row.processo or not row.processo.strip():
        motivos.append("Processo vazio")
    if _orgao_id(mapa_org, "compras_api", row.unidade_compradora) is None:
        motivos.append("Órgão sem vínculo consolidado")
    elif row.processo and extrair_numero_processo_api(row.processo) is None:
        motivos.append("Processo não interpretável")
    return "; ".join(motivos) if motivos else "Chave inválida"


def _motivo_sem_chave_powerbi(
    row: PbiProcessoLicitatorio,
    orgao_nome: str,
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
) -> str:
    motivos: list[str] = []
    if _orgao_id(mapa_org, "powerbi", orgao_nome) is None:
        motivos.append("Órgão sem vínculo consolidado")
    if normalizar_processo_powerbi(row.processo) is None:
        motivos.append("Processo não numérico")
    return "; ".join(motivos) if motivos else "Chave inválida"


def _item_sem_chave_api(row: CompraContratacao, mapa_org: dict) -> dict[str, Any]:
    return {
        "id": row.id,
        "ano": row.ano,
        "processo": row.processo,
        "orgao": row.unidade_nome,
        "orgao_chave": row.unidade_compradora,
        "numero": row.numero,
        "modalidade": row.modalidade_descricao,
        "motivo": _motivo_sem_chave_api(row, mapa_org),
    }


def _item_sem_chave_powerbi(
    row: PbiProcessoLicitatorio,
    orgao_nome: str,
    mapa_org: dict,
) -> dict[str, Any]:
    return {
        "id": row.id,
        "ano": row.ano_processo,
        "processo": row.processo,
        "orgao": orgao_nome,
        "modalidade": row.modalidade,
        "motivo": _motivo_sem_chave_powerbi(row, orgao_nome, mapa_org),
    }


def _pack_cruzamento(
    resumo: dict[str, int],
    sem_chave_itens: list[dict[str, Any]],
    em_outra_key: str,
) -> dict[str, Any]:
    total_lista = len(sem_chave_itens)
    return {
        em_outra_key: resumo["em_ambas"],
        "em_ambas": resumo["em_ambas"],
        "com_chave_valida": resumo["com_chave_valida"],
        "sem_chave": resumo["sem_chave"],
        "somente_esta_base": resumo["somente_esta_base"],
        "sem_chave_registros": sem_chave_itens[:_LIMITE_SEM_CHAVE_LISTA],
        "sem_chave_registros_total": total_lista,
    }


def _orgao_id(mapa: dict[tuple[str, str], OrgaoConsolidado], fonte: str, chave: str) -> int | None:
    org = mapa.get((fonte, chave))
    return org.id if org else None


def _chave_api(
    row: CompraContratacao,
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
) -> ChaveProcesso | None:
    if not row.processo:
        return None
    oid = _orgao_id(mapa_org, "compras_api", row.unidade_compradora)
    num = extrair_numero_processo_api(row.processo)
    if oid is None or num is None:
        return None
    return (oid, row.ano, num)


def _chave_powerbi(
    row: PbiProcessoLicitatorio,
    orgao_nome: str,
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
) -> ChaveProcesso | None:
    oid = _orgao_id(mapa_org, "powerbi", orgao_nome)
    num = normalizar_processo_powerbi(row.processo)
    if oid is None or num is None:
        return None
    return (oid, row.ano_processo, num)


def _resumo_cruzamento(
    chaves: list[ChaveProcesso | None],
    outra_base: set[ChaveProcesso],
) -> dict[str, int]:
    """Cruzamento entre duas bases: presença das chaves na outra base."""
    com_chave = sum(1 for k in chaves if k)
    em_ambas = sum(1 for k in chaves if k and k in outra_base)
    return {
        "com_chave_valida": com_chave,
        "sem_chave": len(chaves) - com_chave,
        "em_ambas": em_ambas,
        "somente_esta_base": com_chave - em_ambas,
    }


def _calcular_cruzamentos(
    db: Session,
    ano: int | None,
    chaves_org: dict[str, set[str]],
    chaves_mod: dict[str, set[str]],
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
) -> dict[str, dict[str, Any]]:
    crit_a = _where_compras(ano, chaves_org, chaves_mod)
    crit_b = _where_pbi(ano, chaves_org, chaves_mod)

    chaves_api: list[ChaveProcesso | None] = []
    set_api: set[ChaveProcesso] = set()
    sem_api: list[dict[str, Any]] = []
    for row in db.scalars(select(CompraContratacao).where(*crit_a)).all():
        k = _chave_api(row, mapa_org)
        chaves_api.append(k)
        if k:
            set_api.add(k)
        else:
            sem_api.append(_item_sem_chave_api(row, mapa_org))

    chaves_pbi: list[ChaveProcesso | None] = []
    set_pbi: set[ChaveProcesso] = set()
    sem_pbi: list[dict[str, Any]] = []
    rows_pbi = db.execute(
        select(PbiProcessoLicitatorio, PbiOrgao.nome)
        .join(PbiOrgao, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
        .where(*crit_b)
    ).all()
    for proc, orgao_nome in rows_pbi:
        k = _chave_powerbi(proc, orgao_nome, mapa_org)
        chaves_pbi.append(k)
        if k:
            set_pbi.add(k)
        else:
            sem_pbi.append(_item_sem_chave_powerbi(proc, orgao_nome, mapa_org))

    ra = _resumo_cruzamento(chaves_api, set_pbi)
    rb = _resumo_cruzamento(chaves_pbi, set_api)

    return {
        "api": _pack_cruzamento(ra, sem_api, "em_powerbi"),
        "powerbi": _pack_cruzamento(rb, sem_pbi, "em_api"),
    }


def _mapa_orgaos(db: Session) -> dict[tuple[str, str], OrgaoConsolidado]:
    rows = db.scalars(
        select(OrgaoVinculo)
        .options(selectinload(OrgaoVinculo.orgao_consolidado))
        .join(OrgaoConsolidado)
        .where(OrgaoConsolidado.ativo.is_(True))
    ).all()
    return {(v.fonte, v.chave): v.orgao_consolidado for v in rows}


def _mapa_modalidades(db: Session) -> dict[tuple[str, str], ModalidadeConsolidada]:
    rows = db.scalars(
        select(ModalidadeVinculo)
        .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
        .join(ModalidadeConsolidada)
        .where(ModalidadeConsolidada.ativo.is_(True))
    ).all()
    return {(v.fonte, v.chave): v.modalidade_consolidada for v in rows}


def _chaves_orgao(db: Session, orgao_id: int | None) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {"compras_api": set(), "powerbi": set()}
    if orgao_id is None:
        return out
    vinculos = db.scalars(
        select(OrgaoVinculo).where(OrgaoVinculo.orgao_consolidado_id == orgao_id)
    ).all()
    for v in vinculos:
        out.setdefault(v.fonte, set()).add(v.chave)
    return out


def _chaves_modalidade(db: Session, modalidade_id: int | list[int] | None) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {"compras_api": set(), "powerbi": set()}
    ids = _norm_ids(modalidade_id)
    if not ids:
        return out
    vinculos = db.scalars(
        select(ModalidadeVinculo).where(ModalidadeVinculo.modalidade_consolidada_id.in_(ids))
    ).all()
    for v in vinculos:
        out.setdefault(v.fonte, set()).add(v.chave)
    return out


def _rotulo_orgao(orgao: OrgaoConsolidado | None) -> str:
    if not orgao:
        return _SEM_VINCULO
    return orgao.sigla or orgao.nome


def _agrupar_por_orgao(
    itens: list[tuple[str, str, int]],
    fonte: str,
    mapa: dict[tuple[str, str], OrgaoConsolidado],
) -> list[dict[str, Any]]:
    """Agrupa contagens por órgão consolidado."""
    buckets: dict[str, dict[str, Any]] = {}
    for chave, rotulo_raw, total in itens:
        org = mapa.get((fonte, chave))
        nome = _rotulo_orgao(org) if org else (rotulo_raw or chave or _SEM_VINCULO)
        if nome not in buckets:
            buckets[nome] = {"nome": nome, "total": 0, "vinculado": org is not None}
        buckets[nome]["total"] += total
    return sorted(buckets.values(), key=lambda x: (-x["total"], x["nome"]))


def _agrupar_por_modalidade(
    itens: list[tuple[str, str, int]],
    fonte: str,
    mapa: dict[tuple[str, str], ModalidadeConsolidada],
) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for chave, rotulo_raw, total in itens:
        mod = mapa.get((fonte, chave))
        nome = mod.nome if mod else (rotulo_raw or chave or _SEM_VINCULO)
        if nome not in buckets:
            buckets[nome] = {"nome": nome, "total": 0, "vinculado": mod is not None}
        buckets[nome]["total"] += total
    return sorted(buckets.values(), key=lambda x: (-x["total"], x["nome"]))


def _agrupar_situacao(itens: list[tuple[str | None, int]]) -> list[dict[str, Any]]:
    buckets: dict[str, int] = {}
    for sit, total in itens:
        nome = (sit or "").strip() or "Não informada"
        buckets[nome] = buckets.get(nome, 0) + total
    return [{"nome": k, "total": v} for k, v in sorted(buckets.items(), key=lambda x: (-x[1], x[0]))]


def _where_compras(
    ano: int | None,
    chaves_org: dict[str, set[str]],
    chaves_mod: dict[str, set[str]],
) -> list[Any]:
    crit: list[Any] = []
    if ano:
        crit.append(CompraContratacao.ano == ano)
    org = chaves_org.get("compras_api")
    if org:
        crit.append(CompraContratacao.unidade_compradora.in_(org))
    mod = chaves_mod.get("compras_api")
    if mod:
        crit.append(CompraContratacao.modalidade_codigo.in_(mod))
    return crit


def _stats_api(
    db: Session,
    ano: int | None,
    chaves_org: dict[str, set[str]],
    chaves_mod: dict[str, set[str]],
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
    mapa_mod: dict[tuple[str, str], ModalidadeConsolidada],
) -> dict[str, Any]:
    crit = _where_compras(ano, chaves_org, chaves_mod)

    por_orgao_raw = db.execute(
        select(
            CompraContratacao.unidade_compradora,
            CompraContratacao.unidade_nome,
            func.count(),
        )
        .where(*crit)
        .group_by(CompraContratacao.unidade_compradora, CompraContratacao.unidade_nome)
    ).all()

    por_mod_raw = db.execute(
        select(
            CompraContratacao.modalidade_codigo,
            CompraContratacao.modalidade_descricao,
            func.count(),
        )
        .where(*crit)
        .where(
            CompraContratacao.modalidade_codigo.isnot(None),
            CompraContratacao.modalidade_codigo != "",
        )
        .group_by(CompraContratacao.modalidade_codigo, CompraContratacao.modalidade_descricao)
    ).all()

    por_sit_raw = _por_situacao_api_itens(db, crit)

    total = db.scalar(select(func.count()).select_from(CompraContratacao).where(*crit)) or 0

    valores = db.execute(
        select(CompraContratacao.valor_total_estimado, CompraContratacao.valor_total_homologado)
        .where(*crit)
    ).all()
    est = Decimal(0)
    hom = Decimal(0)
    for ve, vh in valores:
        pe = _parse_valor(ve)
        ph = _parse_valor(vh)
        if pe:
            est += pe
        if ph:
            hom += ph

    return {
        "total_processos": total,
        "por_orgao": _agrupar_por_orgao(
            [(c, n, t) for c, n, t in por_orgao_raw], "compras_api", mapa_org
        ),
        "por_modalidade": _agrupar_por_modalidade(
            [(str(c), d or str(c), t) for c, d, t in por_mod_raw], "compras_api", mapa_mod
        ),
        "por_situacao": _agrupar_situacao(por_sit_raw),
        "situacao_fonte": "itens_consolidados",
        "valor_estimado_total": _fmt_valor(est if est else None),
        "valor_homologado_total": _fmt_valor(hom if hom else None),
    }


def _where_pbi(
    ano: int | None,
    chaves_org: dict[str, set[str]],
    chaves_mod: dict[str, set[str]],
) -> list[Any]:
    crit: list[Any] = []
    if ano:
        crit.append(PbiProcessoLicitatorio.ano_processo == ano)
    pbi_org = chaves_org.get("powerbi")
    if pbi_org:
        crit.append(
            PbiProcessoLicitatorio.orgao_id.in_(
                select(PbiOrgao.id).where(PbiOrgao.nome.in_(pbi_org))
            )
        )
    pbi_mod = chaves_mod.get("powerbi")
    if pbi_mod:
        crit.append(PbiProcessoLicitatorio.modalidade.in_(pbi_mod))
    return crit


def _stats_powerbi(
    db: Session,
    ano: int | None,
    chaves_org: dict[str, set[str]],
    chaves_mod: dict[str, set[str]],
    mapa_org: dict[tuple[str, str], OrgaoConsolidado],
    mapa_mod: dict[tuple[str, str], ModalidadeConsolidada],
) -> dict[str, Any]:
    crit = _where_pbi(ano, chaves_org, chaves_mod)

    por_orgao_raw = db.execute(
        select(PbiOrgao.nome, PbiOrgao.nome, func.count())
        .join(PbiProcessoLicitatorio, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
        .where(*crit)
        .group_by(PbiOrgao.nome)
    ).all()

    por_mod_raw = db.execute(
        select(PbiProcessoLicitatorio.modalidade, PbiProcessoLicitatorio.modalidade, func.count())
        .where(*crit)
        .where(
            PbiProcessoLicitatorio.modalidade.isnot(None),
            PbiProcessoLicitatorio.modalidade != "",
        )
        .group_by(PbiProcessoLicitatorio.modalidade)
    ).all()

    por_sit_raw = db.execute(
        select(PbiProcessoLicitatorio.situacao, func.count())
        .where(*crit)
        .group_by(PbiProcessoLicitatorio.situacao)
    ).all()

    total = db.scalar(
        select(func.count()).select_from(PbiProcessoLicitatorio).where(*crit)
    ) or 0

    valores = db.scalars(
        select(PbiProcessoLicitatorio.valor_licitacao).where(*crit)
    ).all()
    sol = Decimal(0)
    for v in valores:
        p = _parse_valor(v)
        if p:
            sol += p

    return {
        "total_processos": total,
        "por_orgao": _agrupar_por_orgao(
            [(n, n, t) for n, _, t in por_orgao_raw], "powerbi", mapa_org
        ),
        "por_modalidade": _agrupar_por_modalidade(
            [(m, m, t) for m, _, t in por_mod_raw], "powerbi", mapa_mod
        ),
        "por_situacao": _agrupar_situacao(por_sit_raw),
        "valor_solicitacao_total": _fmt_valor(sol if sol else None),
    }


@router.get("/api/dashboard-gerencial/filtros")
def filtros_dashboard(db: Session = Depends(get_db)):
    anos_api = db.scalars(
        select(CompraContratacao.ano).distinct().order_by(CompraContratacao.ano.desc())
    ).all()
    anos_pbi = db.scalars(
        select(PbiProcessoLicitatorio.ano_processo)
        .distinct()
        .order_by(PbiProcessoLicitatorio.ano_processo.desc())
    ).all()
    anos = sorted(set(anos_api) | set(anos_pbi), reverse=True)

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

    return {
        "anos": anos,
        "orgaos": [{"id": o.id, "nome": o.nome, "sigla": o.sigla} for o in orgaos],
        "modalidades": [{"id": m.id, "nome": m.nome} for m in modalidades],
    }


@router.get("/api/dashboard-gerencial/stats")
def stats_dashboard(
    db: Session = Depends(get_db),
    ano: int | None = Query(None, ge=2000, le=2100),
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
):
    ids_mod = _norm_ids(modalidade_id)
    mapa_org = _mapa_orgaos(db)
    mapa_mod = _mapa_modalidades(db)
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, ids_mod)

    orgao_nome = None
    if orgao_id:
        org = db.get(OrgaoConsolidado, orgao_id)
        orgao_nome = org.sigla or org.nome if org else None
    mod_nome = _nomes_modalidades(db, ids_mod)

    cruz = _calcular_cruzamentos(db, ano, chaves_org, chaves_mod, mapa_org)
    api = _stats_api(db, ano, chaves_org, chaves_mod, mapa_org, mapa_mod)
    powerbi = _stats_powerbi(db, ano, chaves_org, chaves_mod, mapa_org, mapa_mod)
    api["cruzamento"] = cruz["api"]
    powerbi["cruzamento"] = cruz["powerbi"]

    return {
        "filtros": {
            "ano": ano,
            "orgao_id": orgao_id,
            "orgao_nome": orgao_nome,
            "modalidade_id": ids_mod or None,
            "modalidade_nome": mod_nome,
        },
        "api": api,
        "powerbi": powerbi,
        "interpretacao_campos": {
            "api": {"ano": "ANO", "processo": "PROCESSO (ex.: 5302023→530, 20.039/2023→20039, 25.528→25528)"},
            "powerbi": {"ano": "ANOPROCESSO", "processo": "PROCESSO"},
        },
    }
