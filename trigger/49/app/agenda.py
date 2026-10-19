from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.coleta import configuracao, executar_faixa_a
from app.config import settings
from app.faixa_b import executar_faixa_b
from app.faixa_cd import tentar_faixa_c, tentar_faixa_d
from app.models import ColetaJob, Filial
from app.regras import dentro_da_madrugada, rodizio
from app.tempo import agora_negocio


def enfileirar_noite(db: Session, momento: datetime | None = None) -> list[ColetaJob]:
    momento = momento or agora_negocio()
    cfg = configuracao(db)
    if not dentro_da_madrugada(
        momento, cfg.hora, cfg.minuto, cfg.backup_hora, cfg.backup_minuto
    ):
        return []
    noite = momento.date()
    filiais = list(
        db.scalars(
            select(Filial).where(Filial.situacao == "ativa").order_by(Filial.nome)
        ).all()
    )
    ids = [str(f.id) for f in filiais]
    ordem = rodizio(ids, str(cfg.ultimo_filial_id) if cfg.ultimo_filial_id else None)
    por_id = {str(f.id): f for f in filiais}
    criados: list[ColetaJob] = []
    for filial_id in ordem:
        filial = por_id[filial_id]
        if _carga_aberta(db, filial.id):
            criados.extend(_garantir_carga(db, filial.id, noite))
            continue
        criados.extend(_garantir(db, filial.id, "A", "diario", noite))
    if ordem:
        db.flush()
    db.commit()
    return criados


def _carga_aberta(db: Session, filial_id: uuid.UUID) -> bool:
    job = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == filial_id,
            ColetaJob.tipo == "carga_inicial",
            ColetaJob.status.in_(("pendente", "executando", "continua_amanha", "parcial")),
        )
    )
    return job is not None


def _garantir_carga(db: Session, filial_id: uuid.UUID, noite: date) -> list[ColetaJob]:
    existe = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == filial_id,
            ColetaJob.tipo == "carga_inicial",
            ColetaJob.faixa == "A",
        )
    )
    if existe is not None:
        return []
    job = ColetaJob(
        filial_id=filial_id,
        faixa="A",
        tipo="carga_inicial",
        noite=noite,
        status="pendente",
    )
    db.add(job)
    db.flush()
    return [job]


def _garantir(db, filial_id, faixa: str, tipo: str, noite: date) -> list[ColetaJob]:
    aberto = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == filial_id,
            ColetaJob.faixa == faixa,
            ColetaJob.tipo == tipo,
            ColetaJob.status.in_(("pendente", "executando", "continua_amanha")),
        )
    )
    if aberto is not None:
        return []
    existe = db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == filial_id,
            ColetaJob.faixa == faixa,
            ColetaJob.tipo == tipo,
            ColetaJob.noite == noite,
        )
    )
    if existe is not None:
        return []
    job = ColetaJob(filial_id=filial_id, faixa=faixa, tipo=tipo, noite=noite, status="pendente")
    db.add(job)
    db.flush()
    return [job]


def enfileirar_manual(db: Session, filial_id: uuid.UUID, tipo: str) -> ColetaJob:
    if tipo not in {"diario", "carga_inicial"}:
        from app.contas import ErroRegra

        raise ErroRegra("Tipo de coleta inválido.")
    noite = agora_negocio().date()
    if tipo == "carga_inicial":
        criado = _garantir_carga(db, filial_id, noite)
        db.commit()
        if criado:
            return criado[0]
        return db.scalar(
            select(ColetaJob).where(
                ColetaJob.filial_id == filial_id,
                ColetaJob.tipo == "carga_inicial",
                ColetaJob.faixa == "A",
            )
        )
    criado = _garantir(db, filial_id, "A", "diario", noite)
    db.commit()
    return criado[0] if criado else db.scalar(
        select(ColetaJob).where(
            ColetaJob.filial_id == filial_id,
            ColetaJob.faixa == "A",
            ColetaJob.tipo == "diario",
            ColetaJob.noite == noite,
        )
    )


def processar_disponiveis(db: Session, cliente_a, cliente_b, cliente_cd=None) -> int:
    """Uma faixa por vez. Job deixado em execução é retomado antes de um pendente."""
    executando = db.scalar(select(ColetaJob).where(ColetaJob.status == "executando"))
    job = executando or _proximo_pendente(db)
    if job is None:
        return 0
    if job.faixa == "A":
        executar_faixa_a(db, job, cliente_a)
    elif job.faixa == "B":
        executar_faixa_b(db, job, cliente_b)
    elif job.faixa == "C":
        tentar_faixa_c(habilitada=settings.faixa_c, anterior_ok=True, cliente=cliente_cd)
        job.status = "ok" if settings.faixa_c else "erro"
        job.motivo = "" if settings.faixa_c else "Faixa C desligada."
        db.commit()
    elif job.faixa == "D":
        tentar_faixa_d(
            habilitada=settings.faixa_d,
            anterior_ok=settings.faixa_c,
            cliente=cliente_cd,
        )
        job.status = "ok" if settings.faixa_d and settings.faixa_c else "erro"
        job.motivo = "" if job.status == "ok" else "Faixa D desligada."
        db.commit()
    return 1


def _proximo_pendente(db: Session) -> ColetaJob | None:
    pendentes = list(db.scalars(select(ColetaJob).where(ColetaJob.status == "pendente")).all())
    if not pendentes:
        return None
    cfg = configuracao(db)
    ids = sorted({str(job.filial_id) for job in pendentes})
    ordem = rodizio(ids, str(cfg.ultimo_filial_id) if cfg.ultimo_filial_id else None)
    for filial_id in ordem:
        do_filial = [job for job in pendentes if str(job.filial_id) == filial_id]
        do_filial.sort(key=lambda job: (job.faixa, job.noite))
        cfg.ultimo_filial_id = do_filial[0].filial_id
        db.flush()
        return do_filial[0]
    return None


def promover_continua_amanha(db: Session, hoje: date) -> int:
    linhas = db.scalars(
        select(ColetaJob).where(
            ColetaJob.status == "continua_amanha",
            ColetaJob.noite < hoje,
        )
    ).all()
    for job in linhas:
        job.status = "pendente"
    if linhas:
        db.commit()
    return len(linhas)


def ciclo(db: Session, cliente_a, cliente_b, cliente_cd=None, momento: datetime | None = None) -> None:
    momento = momento or agora_negocio()
    promover_continua_amanha(db, momento.date())
    enfileirar_noite(db, momento)
    processar_disponiveis(db, cliente_a, cliente_b, cliente_cd)


def backup_deve_rodar(momento: datetime, *, coleta_ativa: bool, ja_adiou: bool) -> str:
    from app.regras import decidir_backup

    cfg_hora = 5
    cfg_minuto = 10
    if (momento.hour, momento.minute) < (cfg_hora, cfg_minuto):
        return "aguardar"
    if momento.hour > cfg_hora + 2:
        return "aguardar"
    return decidir_backup(coleta_ativa=coleta_ativa, ja_adiou=ja_adiou)


def adiar_backup(momento: datetime) -> datetime:
    return momento + timedelta(minutes=30)
