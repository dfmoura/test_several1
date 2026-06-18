"""Guia gerencial — endpoint agregado (removível sem afetar coleta/consulta)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import CompraContratacao, Licitacao, Observador, get_db

router = APIRouter(tags=["dashboard"])

_TOP_N = 8


def _top_groups(db: Session, model, column, limit: int = _TOP_N) -> list[dict]:
    rows = db.execute(
        select(column, func.count())
        .where(column.isnot(None), column != "")
        .group_by(column)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return [{"label": str(label), "total": total} for label, total in rows]


def _por_empresa(db: Session) -> list[dict]:
    rows = db.execute(
        select(Licitacao.empresa_codigo, Licitacao.empresa_nome, func.count())
        .group_by(Licitacao.empresa_codigo, Licitacao.empresa_nome)
        .order_by(func.count().desc())
    ).all()
    return [{"codigo": cod, "nome": nome, "total": total} for cod, nome, total in rows]


def _por_unidade(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            CompraContratacao.unidade_compradora,
            CompraContratacao.unidade_nome,
            func.count(),
        )
        .group_by(CompraContratacao.unidade_compradora, CompraContratacao.unidade_nome)
        .order_by(func.count().desc())
    ).all()
    return [{"codigo": cod, "nome": nome, "total": total} for cod, nome, total in rows]


def _carga_observadores(db: Session) -> list[dict]:
    obs_list = db.scalars(
        select(Observador).where(Observador.ativo.is_(True)).order_by(Observador.nome)
    ).all()
    if not obs_list:
        return []

    lic_counts = dict(
        db.execute(
            select(Licitacao.observador_id, func.count())
            .where(Licitacao.observador_id.isnot(None))
            .group_by(Licitacao.observador_id)
        ).all()
    )
    compra_counts = dict(
        db.execute(
            select(CompraContratacao.observador_id, func.count())
            .where(CompraContratacao.observador_id.isnot(None))
            .group_by(CompraContratacao.observador_id)
        ).all()
    )

    carga = []
    for obs in obs_list:
        municipal = lic_counts.get(obs.id, 0)
        compras = compra_counts.get(obs.id, 0)
        if municipal or compras:
            carga.append(
                {
                    "id": obs.id,
                    "nome": obs.nome,
                    "municipal": municipal,
                    "compras": compras,
                    "total": municipal + compras,
                }
            )
    carga.sort(key=lambda x: x["total"], reverse=True)
    return carga


@router.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_municipal = db.scalar(select(func.count()).select_from(Licitacao)) or 0
    total_compras = db.scalar(select(func.count()).select_from(CompraContratacao)) or 0
    obs_ativos = (
        db.scalar(select(func.count()).select_from(Observador).where(Observador.ativo.is_(True))) or 0
    )

    lic_com_obs = (
        db.scalar(
            select(func.count()).select_from(Licitacao).where(Licitacao.observador_id.isnot(None))
        )
        or 0
    )
    compras_com_obs = (
        db.scalar(
            select(func.count())
            .select_from(CompraContratacao)
            .where(CompraContratacao.observador_id.isnot(None))
        )
        or 0
    )

    ultima_lic = db.scalar(select(func.max(Licitacao.coletado_em)))
    ultima_compra = db.scalar(select(func.max(CompraContratacao.coletado_em)))

    por_ano_municipal = dict(
        db.execute(select(Licitacao.ano, func.count()).group_by(Licitacao.ano).order_by(Licitacao.ano))
        .all()
    )
    por_ano_compras = dict(
        db.execute(
            select(CompraContratacao.ano, func.count()).group_by(CompraContratacao.ano).order_by(
                CompraContratacao.ano
            )
        ).all()
    )

    anos = sorted(set(por_ano_municipal) | set(por_ano_compras))
    ano_atual = datetime.now().year
    ano_referencia = ano_atual if ano_atual in (por_ano_municipal or por_ano_compras) else (anos[-1] if anos else ano_atual)

    return {
        "gerado_em": datetime.now().isoformat(timespec="seconds"),
        "ano_referencia": ano_referencia,
        "municipal": {
            "total": total_municipal,
            "por_ano": por_ano_municipal,
            "ano_referencia": por_ano_municipal.get(ano_referencia, 0),
            "por_empresa": _por_empresa(db),
            "por_situacao": _top_groups(db, Licitacao, Licitacao.situacao),
            "por_modalidade": _top_groups(db, Licitacao, Licitacao.modalidade),
            "com_observador": lic_com_obs,
            "sem_observador": max(0, total_municipal - lic_com_obs),
            "ultima_coleta": ultima_lic.isoformat(timespec="seconds") if ultima_lic else None,
        },
        "compras": {
            "total": total_compras,
            "por_ano": por_ano_compras,
            "ano_referencia": por_ano_compras.get(ano_referencia, 0),
            "por_unidade": _por_unidade(db),
            "por_situacao": _top_groups(db, CompraContratacao, CompraContratacao.situacao_lista),
            "por_modalidade": _top_groups(db, CompraContratacao, CompraContratacao.modalidade_descricao),
            "com_observador": compras_com_obs,
            "sem_observador": max(0, total_compras - compras_com_obs),
            "ultima_coleta": ultima_compra.isoformat(timespec="seconds") if ultima_compra else None,
        },
        "observadores": {
            "total_ativos": obs_ativos,
            "carga": _carga_observadores(db),
            "vinculos_total": lic_com_obs + compras_com_obs,
        },
        "anos": anos,
    }
