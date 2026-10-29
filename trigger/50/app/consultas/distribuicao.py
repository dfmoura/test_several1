"""Distribuição geográfica de vencedores — Início (visão filial).

Eixo: sede cadastral do fornecedor vencedor (UF / município IBGE).
Fonte: resultados homologados (07.3) × ``fornecedores`` enriquecidos.
Escopo: UASGs da visão de filial + período canônico do sistema.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session

from app.compras.normalizers import normalizar_ni
from app.consultas.periodo import PeriodoAplicado, periodo_tudo
from app.consultas.vencedores import _UF_NOMES, _ids_compra_no_recorte, _parse_valor
from app.database import Contratacao, Fornecedor, ResultadoItem

Metrica = Literal["quantidade", "valor"]
_LIMITE_MUNICIPIOS = 400


def _norm_municipio(nome: str | None) -> str:
    return (nome or "").strip().upper() or "NÃO INFORMADO"


def _chave_municipio(
    uf: str,
    nome: str | None,
    ibge: int | None,
) -> tuple[str, str, int | None]:
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
        # Homologado por id_compra neste bucket — rateio do estimado.
        "hom_por_compra": defaultdict(lambda: Decimal(0)),
        "rotulo": "",
    }


def _fechar_agg(
    raw: dict[str, Any],
    *,
    estimados_por_compra: dict[str, Decimal],
    hom_total_por_compra: dict[str, Decimal],
) -> dict[str, Any]:
    """Fecha agregação; estimado rateado pela fatia do valor homologado no bucket."""
    valor_est = Decimal(0)
    for cid in raw["contratacoes"]:
        est = estimados_por_compra.get(cid)
        if est is None:
            continue
        total_h = hom_total_por_compra.get(cid) or Decimal(0)
        bucket_h = raw["hom_por_compra"].get(cid) or Decimal(0)
        if total_h > 0:
            valor_est += est * bucket_h / total_h
        else:
            valor_est += est
    return {
        "quantidade": int(raw["quantidade"]),
        "valor": float(raw["valor"].quantize(Decimal("0.01"))) if raw["valor"] else 0.0,
        "valor_estimado": float(valor_est.quantize(Decimal("0.01"))) if valor_est else 0.0,
        "contratacoes": len(raw["contratacoes"]),
        "fornecedores": len(raw["fornecedores"]),
    }


def _contagens_escopo(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None,
) -> tuple[int, int]:
    """Total e homologadas no escopo/período — mesmo critério dos KPIs."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return 0, 0
    if ids_periodo is not None and not ids_periodo:
        return 0, 0

    tem_resultado = exists(
        select(ResultadoItem.id).where(
            ResultadoItem.id_compra == Contratacao.id_compra
        )
    )
    q_c = select(func.count()).select_from(Contratacao)
    q_hom = (
        select(func.count())
        .select_from(Contratacao)
        .where(or_(Contratacao.existe_resultado.is_(True), tem_resultado))
    )
    if escopo_uasgs is not None:
        q_c = q_c.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
        q_hom = q_hom.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if ids_periodo is not None:
        q_c = q_c.where(Contratacao.id_compra.in_(list(ids_periodo)))
        q_hom = q_hom.where(Contratacao.id_compra.in_(list(ids_periodo)))
    return int(db.scalar(q_c) or 0), int(db.scalar(q_hom) or 0)


def distribuicao_geografica(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    periodo: PeriodoAplicado | None = None,
    metrica: Metrica = "quantidade",
) -> dict[str, Any]:
    """Agrega itens homologados pela localidade do fornecedor vencedor."""
    periodo = periodo or periodo_tudo()
    metrica_ok: Metrica = "valor" if metrica == "valor" else "quantidade"

    empty = {
        "periodo_aplicado": periodo.to_dict(),
        "metrica": metrica_ok,
        "resumo": {
            "quantidade": 0,
            "valor": 0.0,
            "valor_estimado": 0.0,
            "contratacoes": 0,
            "escopo_total": 0,
            "escopo_homologadas": 0,
            "escopo_valor_estimado": 0.0,
            "escopo_valor_homologado": 0.0,
            "fornecedores": 0,
            "ufs": 0,
            "municipios": 0,
            "sem_localidade": 0,
        },
        "por_uf": [],
        "por_municipio": [],
        "por_municipio_total": 0,
        "interpretacao": {
            "eixo": "Localidade do fornecedor vencedor (sede cadastral)",
            "quantidade": (
                "Campo legado (itens 07.3). A métrica de intensidade "
                "«quantidade» no mapa usa ``contratacoes`` (homologadas)."
            ),
            "contratacoes": (
                "Contratações homologadas distintas (ao menos um item 07.3) "
                "nos filtros. Universo do mapa = homologadas "
                "(não há total geográfico de não-homologadas por sede do vencedor)."
            ),
            "valor": "Soma de valor_total_homologado dos itens/resultados",
            "valor_estimado": (
                "Valor estimado da contratação rateado pela participação do "
                "bucket no valor homologado da mesma id_compra (evita "
                "duplicar estimado quando há vencedores em várias UFs)."
            ),
        },
        "fonte": "sqlite_nativo",
    }

    ids_ok = _ids_compra_no_recorte(
        db, escopo_uasgs=escopo_uasgs, periodo=periodo
    )
    escopo_total, escopo_hom = _contagens_escopo(
        db, escopo_uasgs=escopo_uasgs, ids_periodo=ids_ok
    )
    from app.consultas.service import _valores_indicadores

    escopo_valor_est, escopo_valor_hom = _valores_indicadores(
        db, escopo_uasgs=escopo_uasgs, ids_periodo=ids_ok
    )
    empty["resumo"]["escopo_total"] = escopo_total
    empty["resumo"]["escopo_homologadas"] = escopo_hom
    empty["resumo"]["escopo_valor_estimado"] = escopo_valor_est
    empty["resumo"]["escopo_valor_homologado"] = escopo_valor_hom

    if ids_ok is not None and not ids_ok:
        return empty

    stmt = select(
        ResultadoItem.id_compra,
        ResultadoItem.ni_fornecedor,
        ResultadoItem.valor_total_homologado,
        ResultadoItem.fornecedor_id,
    ).where(
        ResultadoItem.ni_fornecedor.is_not(None),
        ResultadoItem.ni_fornecedor != "",
    )
    if ids_ok is not None:
        stmt = stmt.where(ResultadoItem.id_compra.in_(list(ids_ok)))

    rows = db.execute(stmt).all()
    if not rows:
        return empty

    nis: set[str] = set()
    forn_ids: set[int] = set()
    ids_compra_res: set[str] = set()
    for id_compra, ni_raw, _valor, fid in rows:
        ni = normalizar_ni(ni_raw)
        if ni:
            nis.add(ni)
        if fid:
            forn_ids.add(int(fid))
        if id_compra:
            ids_compra_res.add(str(id_compra))

    by_id: dict[int, Fornecedor] = {}
    by_ni: dict[str, Fornecedor] = {}
    if forn_ids:
        for f in db.scalars(
            select(Fornecedor).where(Fornecedor.id.in_(list(forn_ids)))
        ).all():
            by_id[f.id] = f
            if f.ni:
                by_ni[f.ni] = f
    missing = nis - set(by_ni)
    if missing:
        for f in db.scalars(
            select(Fornecedor).where(Fornecedor.ni.in_(list(missing)))
        ).all():
            by_ni[f.ni] = f

    estimados_por_compra: dict[str, Decimal] = {}
    if ids_compra_res:
        for id_c, est_raw in db.execute(
            select(Contratacao.id_compra, Contratacao.valor_total_estimado).where(
                Contratacao.id_compra.in_(list(ids_compra_res))
            )
        ).all():
            if not id_c:
                continue
            pe = _parse_valor(est_raw)
            if pe is not None:
                estimados_por_compra[str(id_c)] = pe

    por_uf: dict[str, dict[str, Any]] = defaultdict(_agg_vazio)
    por_mun: dict[tuple[str, str, int | None], dict[str, Any]] = defaultdict(_agg_vazio)
    total = _agg_vazio()
    hom_total_por_compra: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    sem_localidade = 0

    for id_compra, ni_raw, valor_raw, fid in rows:
        ni = normalizar_ni(ni_raw)
        if not ni:
            continue
        forn = by_id.get(int(fid)) if fid else None
        if forn is None:
            forn = by_ni.get(ni)
        uf_s = ((forn.uf if forn else None) or "").strip().upper()
        if not uf_s:
            sem_localidade += 1
            continue

        mun_nome = forn.municipio if forn else None
        ibge = forn.codigo_municipio_ibge if forn else None
        key_mun = _chave_municipio(uf_s, mun_nome, ibge)
        valor = _parse_valor(valor_raw) or Decimal(0)
        fid_key = forn.id if forn else ni
        cid = str(id_compra) if id_compra else None

        for bucket in (total, por_uf[uf_s], por_mun[key_mun]):
            bucket["quantidade"] += 1
            bucket["valor"] += valor
            if cid:
                bucket["contratacoes"].add(cid)
                bucket["hom_por_compra"][cid] += valor
            bucket["fornecedores"].add(fid_key)

        if cid:
            hom_total_por_compra[cid] += valor

        rotulo = _norm_municipio(mun_nome)
        if not por_mun[key_mun]["rotulo"]:
            por_mun[key_mun]["rotulo"] = rotulo

    def _fecha(raw: dict[str, Any]) -> dict[str, Any]:
        return _fechar_agg(
            raw,
            estimados_por_compra=estimados_por_compra,
            hom_total_por_compra=hom_total_por_compra,
        )

    por_uf_out: list[dict[str, Any]] = []
    for sigla, raw in por_uf.items():
        closed = _fecha(raw)
        mun_count = len({k for k in por_mun if k[0] == sigla})
        por_uf_out.append(
            {
                "uf": sigla,
                "nome": _UF_NOMES.get(sigla, sigla),
                **closed,
                "municipios": mun_count,
            }
        )

    def _chave_metrica(row: dict[str, Any]) -> tuple[float, str]:
        if metrica_ok == "valor":
            return (
                -float(row["valor"] or 0),
                str(row.get("uf") or row.get("municipio") or ""),
            )
        # quantidade = contratações homologadas (não itens)
        return (
            -int(row["contratacoes"] or 0),
            str(row.get("uf") or row.get("municipio") or ""),
        )

    por_uf_out.sort(key=_chave_metrica)

    por_mun_out: list[dict[str, Any]] = []
    for key, raw in por_mun.items():
        sigla, _token, ibge = key
        closed = _fecha(raw)
        por_mun_out.append(
            {
                "uf": sigla,
                "municipio": raw.get("rotulo") or _norm_municipio(None),
                "ibge": ibge,
                **closed,
            }
        )
    por_mun_out.sort(key=_chave_metrica)
    total_mun = len(por_mun_out)

    total_closed = _fecha(total)
    return {
        "periodo_aplicado": periodo.to_dict(),
        "metrica": metrica_ok,
        "resumo": {
            **total_closed,
            "escopo_total": escopo_total,
            "escopo_homologadas": escopo_hom,
            "escopo_valor_estimado": escopo_valor_est,
            "escopo_valor_homologado": escopo_valor_hom,
            "ufs": len(por_uf_out),
            "municipios": total_mun,
            "sem_localidade": sem_localidade,
        },
        "por_uf": por_uf_out,
        "por_municipio": por_mun_out[:_LIMITE_MUNICIPIOS],
        "por_municipio_total": total_mun,
        "interpretacao": empty["interpretacao"],
        "fonte": "sqlite_nativo",
    }
