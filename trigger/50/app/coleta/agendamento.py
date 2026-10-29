"""Agendamento diário lean — config persistida + tick invocável (cron ou scheduler)."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app import database as dbmod
from app.coleta.motor import ColetaError, executar_lote, iniciar_execucao
from app.config import COLETA_SCHEDULER, COLETA_SCHEDULER_POLL_SEC
from app.database import AgendamentoColeta

# Fuso operacional Brasil (Lightsail geralmente UTC; horário local configurável).
_TZ = ZoneInfo("America/Sao_Paulo")
_scheduler_stop = threading.Event()
_scheduler_thread: threading.Thread | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _agora_local() -> datetime:
    return datetime.now(_TZ)


def garantir_agendamento(db: Session) -> AgendamentoColeta:
    row = db.get(AgendamentoColeta, 1)
    if row is None:
        row = AgendamentoColeta(id=1, ativo=False, hora_local="02:00", periodo_dias=365)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def periodo_agendado(db: Session) -> int:
    """Fonte de verdade do período da coleta central (manual e agendada)."""
    return int(garantir_agendamento(db).periodo_dias)


def _alvo_hoje(agora_local: datetime, hora_local: str) -> datetime:
    hh, mm = hora_local.split(":")
    return agora_local.replace(
        hour=int(hh), minute=int(mm), second=0, microsecond=0
    )


def _chave_dia(agora_local: datetime) -> str:
    return agora_local.strftime("%Y-%m-%d")


def _proximo_alvo_iso(row: AgendamentoColeta, agora: datetime) -> str | None:
    if not row.ativo:
        return None
    alvo = _alvo_hoje(agora, row.hora_local)
    chave = _chave_dia(agora)
    # Já disparou hoje → próximo é amanhã no mesmo horário.
    # Ainda não disparou → alvo de hoje (catch-up imediato se já passou).
    if row.ultimo_disparo_chave == chave:
        return (alvo + timedelta(days=1)).isoformat()
    return alvo.isoformat()


def _status_operacional(row: AgendamentoColeta, agora: datetime) -> str:
    if not row.ativo:
        return "inativo"
    chave = _chave_dia(agora)
    if row.ultimo_disparo_chave == chave:
        return "disparado_hoje"
    # Sem disparador in-process: cron externo ainda pode chamar /agendamento/tick.
    if not COLETA_SCHEDULER:
        return "ativo_sem_disparador"
    alvo = _alvo_hoje(agora, row.hora_local)
    if agora < alvo:
        return "aguardando_hora"
    return "pendente_catchup"


def disparador_status() -> dict[str, Any]:
    viva = bool(_scheduler_thread and _scheduler_thread.is_alive())
    return {
        "modo": "scheduler" if COLETA_SCHEDULER else "off",
        "habilitado": bool(COLETA_SCHEDULER),
        "thread_viva": viva,
        "poll_sec": COLETA_SCHEDULER_POLL_SEC,
    }


def obter_agendamento(db: Session) -> dict[str, Any]:
    row = garantir_agendamento(db)
    agora = _agora_local()
    # Fase 2 (CNPJ) — telemetria ao lado do disparo noturno (sem segundo cron).
    from app.enriquecimento.service import obter_pos_coleta_status, orcamento_pos_coleta

    return {
        "ativo": row.ativo,
        "hora_local": row.hora_local,
        "periodo_dias": row.periodo_dias,
        "ultimo_disparo_chave": row.ultimo_disparo_chave,
        "ultimo_execucao_id": row.ultimo_execucao_id,
        "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
        "timezone": "America/Sao_Paulo",
        "disparador": disparador_status(),
        "status_operacional": _status_operacional(row, agora),
        "proximo_alvo_local": _proximo_alvo_iso(row, agora),
        "pos_coleta": {
            "orcamento": orcamento_pos_coleta(db),
            "ultimo": obter_pos_coleta_status(db),
        },
    }


def atualizar_agendamento(
    db: Session,
    *,
    ativo: bool | None = None,
    hora_local: str | None = None,
    periodo_dias: int | None = None,
) -> dict[str, Any]:
    row = garantir_agendamento(db)
    if ativo is not None:
        row.ativo = bool(ativo)
    if hora_local is not None:
        h = hora_local.strip()
        try:
            datetime.strptime(h, "%H:%M")
        except ValueError as exc:
            raise ColetaError("hora_local deve ser HH:MM.") from exc
        row.hora_local = h
    if periodo_dias is not None:
        if periodo_dias < 1 or periodo_dias > 3660:
            raise ColetaError("periodo_dias fora do intervalo permitido (1–3660).")
        row.periodo_dias = int(periodo_dias)
    row.atualizado_em = _utcnow()
    db.commit()
    return obter_agendamento(db)


def tick_agendamento(
    db: Session | None = None,
    *,
    forcar: bool = False,
) -> dict[str, Any]:
    """Se ativo e já passou o horário (ou forcar), dispara. Idempotente por dia.

    Catch-up: se o processo perdeu a janela estreita, o próximo poll após o horário
    ainda dispara uma vez no dia (sem exigir os 15 minutos iniciais).
    """
    owns = db is None
    session = db or dbmod.SessionLocal()
    try:
        row = garantir_agendamento(session)
        agora = _agora_local()
        chave = _chave_dia(agora)

        if not row.ativo and not forcar:
            return {"disparado": False, "motivo": "inativo", "chave_dia": chave}

        if not forcar:
            alvo = _alvo_hoje(agora, row.hora_local)
            if agora < alvo:
                return {
                    "disparado": False,
                    "motivo": "aguardando_hora",
                    "chave_dia": chave,
                    "alvo_local": alvo.strftime("%H:%M"),
                }
            if row.ultimo_disparo_chave == chave:
                return {
                    "disparado": False,
                    "motivo": "ja_disparado_hoje",
                    "chave_dia": chave,
                    "execucao_id": row.ultimo_execucao_id,
                }

        origem = "agendado" if not forcar else "manual"
        # 1) Cria execução + marca o dia *antes* do HTTP longo — evita catch-up
        #    duplicado se o processo reiniciar no meio da coleta.
        exe = iniciar_execucao(
            session,
            origem=origem,
            periodo_dias=row.periodo_dias,
        )
        row.ultimo_disparo_chave = chave
        row.ultimo_execucao_id = exe.id
        row.atualizado_em = _utcnow()
        session.commit()

        # 2) Roda o lote (pode levar minutos; idempotência do dia já gravada).
        exe = executar_lote(session, exe.id)
        return {
            "disparado": True,
            "motivo": "forcado" if forcar else "agendado",
            "chave_dia": chave,
            "execucao_id": exe.id,
            "situacao": exe.situacao,
        }
    except ColetaError as exc:
        return {"disparado": False, "motivo": "erro", "erro": exc.message}
    finally:
        if owns:
            session.close()


def _loop_scheduler(poll_sec: float = 60.0) -> None:
    while not _scheduler_stop.wait(poll_sec):
        try:
            tick_agendamento()
        except Exception:  # noqa: BLE001
            # não derruba o processo; próximo tick tenta de novo
            pass


def iniciar_scheduler(*, poll_sec: float | None = None) -> None:
    """Thread daemon opcional — só sobe se COLETA_SCHEDULER=1."""
    global _scheduler_thread
    if not COLETA_SCHEDULER:
        return
    if _scheduler_thread and _scheduler_thread.is_alive():
        return
    sec = COLETA_SCHEDULER_POLL_SEC if poll_sec is None else poll_sec
    _scheduler_stop.clear()
    _scheduler_thread = threading.Thread(
        target=_loop_scheduler,
        kwargs={"poll_sec": sec},
        name="coleta-scheduler",
        daemon=True,
    )
    _scheduler_thread.start()


def parar_scheduler() -> None:
    _scheduler_stop.set()
