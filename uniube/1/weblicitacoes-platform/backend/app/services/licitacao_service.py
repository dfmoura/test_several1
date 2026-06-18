from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Licitacao, SyncJob


def list_licitacoes(
    db: Session,
    *,
    ano: int | None = None,
    empresa_codigo: str | None = None,
    situacao: str | None = None,
    modalidade: str | None = None,
    texto: str | None = None,
    com_detalhe: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Licitacao], int]:
    stmt = select(Licitacao).options(selectinload(Licitacao.arquivos))
    count_stmt = select(func.count()).select_from(Licitacao)

    filters = []
    if ano is not None:
        filters.append(Licitacao.ano == ano)
    if empresa_codigo is not None:
        filters.append(Licitacao.empresa_codigo == empresa_codigo)
    if situacao:
        filters.append(Licitacao.situacao.ilike(f"%{situacao}%"))
    if modalidade:
        filters.append(Licitacao.modalidade.ilike(f"%{modalidade}%"))
    if com_detalhe is not None:
        filters.append(Licitacao.detalhe_coletado.is_(com_detalhe))
    if texto:
        pattern = f"%{texto}%"
        filters.append(
            or_(
                Licitacao.descricao_edital.ilike(pattern),
                Licitacao.objeto.ilike(pattern),
                Licitacao.processo.ilike(pattern),
                Licitacao.empresa_nome.ilike(pattern),
                Licitacao.solicitante.ilike(pattern),
            )
        )

    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(
            Licitacao.data_abertura.desc().nullslast(),
            Licitacao.processo.asc().nullslast(),
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return list(rows), total


def get_licitacao(db: Session, licitacao_id: int) -> Licitacao | None:
    return db.scalar(
        select(Licitacao)
        .options(selectinload(Licitacao.arquivos))
        .where(Licitacao.id == licitacao_id)
    )


def estatisticas(db: Session) -> dict[str, Any]:
    rows = db.scalars(select(Licitacao)).all()
    por_ano: dict[int, int] = {}
    por_empresa: dict[str, int] = {}
    por_situacao: dict[str, int] = {}
    com_detalhe = 0
    for row in rows:
        if row.ano is not None:
            por_ano[row.ano] = por_ano.get(row.ano, 0) + 1
        nome = row.empresa_nome or "—"
        por_empresa[nome] = por_empresa.get(nome, 0) + 1
        sit = row.situacao or "—"
        por_situacao[sit] = por_situacao.get(sit, 0) + 1
        if row.detalhe_coletado:
            com_detalhe += 1
    return {
        "total": len(rows),
        "por_ano": dict(sorted(por_ano.items(), reverse=True)),
        "por_empresa": dict(sorted(por_empresa.items(), key=lambda x: -x[1])),
        "por_situacao": dict(sorted(por_situacao.items(), key=lambda x: -x[1])),
        "com_detalhe": com_detalhe,
        "sem_detalhe": len(rows) - com_detalhe,
    }


def criar_sync_job(
    db: Session,
    *,
    anos: list[int],
    empresas: list[str] | None,
    coletar_detalhes: bool,
) -> SyncJob:
    job = SyncJob(
        status="pending",
        anos=json.dumps(anos),
        empresas=json.dumps(empresas) if empresas else None,
        coletar_detalhes=coletar_detalhes,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def listar_sync_jobs(db: Session, limit: int = 20) -> list[SyncJob]:
    return list(
        db.scalars(
            select(SyncJob).order_by(SyncJob.criado_em.desc()).limit(limit)
        ).all()
    )


def obter_sync_job(db: Session, job_id: int) -> SyncJob | None:
    return db.get(SyncJob, job_id)


def claim_pending_job(db: Session) -> SyncJob | None:
    job = db.scalar(
        select(SyncJob)
        .where(SyncJob.status == "pending")
        .order_by(SyncJob.criado_em.asc())
        .with_for_update(skip_locked=True)
    )
    if not job:
        return None
    job.status = "running"
    job.iniciado_em = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job
