"""Agendamento diário: coleta unificada → CNPJs pendentes (cadeia).

Fonte da verdade: tabelas ``agendamento_config`` / ``agendamento_execucao``
(editáveis no Setup). Scheduler interno (thread) no fuso America/Sao_Paulo.
Reutiliza ``coleta_hub`` e ``job_pendentes_cnpj`` — sem duplicar lógica.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import date, datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import coleta_hub
from app.compras.job_pendentes_cnpj import (
    executar_job as executar_job_pendentes_cnpj,
    iniciar_job as iniciar_job_pendentes_cnpj,
    status_publico as status_job_pendentes_cnpj,
)
from app.coleta_hub import FASES_COMPRAS_PADRAO
from app.config import POWERBI_DATASETS
from app.database import (
    AgendamentoConfig,
    AgendamentoExecucao,
    SessionLocal,
    SistemaConfig,
    get_db,
)
from app.unidades_compradoras import obter_unidades_compradoras

logger = logging.getLogger(__name__)

FUSO_PADRAO = "America/Sao_Paulo"
SCHEDULER_POLL_SEC = 20
MAX_LOG_LINHAS = 120

_lock = threading.Lock()
_scheduler_thread: threading.Thread | None = None
_scheduler_stop = threading.Event()

# Status em memória (mesmo espírito do painel de coleta).
status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "origem": None,
    "log": [],
    "resultado": None,
    "execucao_id": None,
    "iniciado_em": None,
    "atualizado_em": None,
    "finalizado_em": None,
}


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _agora_iso() -> str:
    return _agora_utc().isoformat()


def _anos_coleta(ano_inicial: int | None, ano_atual: int | None = None) -> list[int]:
    if ano_inicial is None:
        return []
    fim = ano_atual if ano_atual is not None else date.today().year
    if ano_inicial > fim:
        return [ano_inicial]
    return list(range(ano_inicial, fim + 1))


def _log(msg: str) -> None:
    linha = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    logs = list(status.get("log") or [])
    logs = [*logs, linha][-MAX_LOG_LINHAS:]
    status["log"] = logs
    status["atualizado_em"] = _agora_iso()


def _fuso(nome: str | None) -> ZoneInfo:
    try:
        return ZoneInfo((nome or FUSO_PADRAO).strip() or FUSO_PADRAO)
    except Exception:  # noqa: BLE001 — fallback seguro
        return ZoneInfo(FUSO_PADRAO)


def _obter_ou_criar_config(db: Session) -> AgendamentoConfig:
    cfg = db.get(AgendamentoConfig, 1)
    if cfg is None:
        cfg = AgendamentoConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def params_coleta_padrao(db: Session | None = None) -> dict[str, Any]:
    """Defaults sensatos alinhados à tela Coleta + ano inicial do Setup."""
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        sis = db.get(SistemaConfig, 1)
        ano_atual = date.today().year
        anos = _anos_coleta(
            sis.ano_inicial_coleta if sis else None,
            ano_atual,
        )
        ano = anos[-1] if anos else ano_atual
        unidades = list(obter_unidades_compradoras(db).keys())
        return {
            "fontes": ["compras", "powerbi"],
            "ano": ano,
            "anos": anos or [ano],
            "unidades": unidades or None,
            "fases": list(FASES_COMPRAS_PADRAO),
            "datasets": list(POWERBI_DATASETS.keys()),
        }
    finally:
        if close:
            db.close()


def config_publica(db: Session) -> dict[str, Any]:
    cfg = _obter_ou_criar_config(db)
    ultima = db.scalars(
        select(AgendamentoExecucao).order_by(AgendamentoExecucao.id.desc()).limit(1)
    ).first()
    tz = _fuso(cfg.fuso)
    agora = datetime.now(tz)
    return {
        "ativo": bool(cfg.ativo),
        "hora": int(cfg.hora),
        "minuto": int(cfg.minuto),
        "horario": f"{int(cfg.hora):02d}:{int(cfg.minuto):02d}",
        "fuso": cfg.fuso or FUSO_PADRAO,
        "incluir_coleta": bool(cfg.incluir_coleta),
        "incluir_cnpjs": bool(cfg.incluir_cnpjs),
        "ultima_chave_dia": cfg.ultima_chave_dia,
        "atualizado_em": cfg.atualizado_em.isoformat() if cfg.atualizado_em else None,
        "agora_local": agora.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "params_coleta": params_coleta_padrao(db),
        "ultima_execucao": _execucao_para_dict(ultima) if ultima else None,
        "em_andamento": bool(status.get("running")),
        "status_vivo": snapshot_status(),
    }


def salvar_config(
    db: Session,
    *,
    ativo: bool,
    hora: int,
    minuto: int,
    fuso: str | None = None,
    incluir_coleta: bool = True,
    incluir_cnpjs: bool = True,
) -> dict[str, Any]:
    if not (0 <= hora <= 23):
        raise ValueError("Hora deve estar entre 0 e 23")
    if not (0 <= minuto <= 59):
        raise ValueError("Minuto deve estar entre 0 e 59")
    if not incluir_coleta and not incluir_cnpjs:
        raise ValueError("Selecione ao menos uma etapa da cadeia (coleta ou CNPJs)")

    fuso_nome = (fuso or FUSO_PADRAO).strip() or FUSO_PADRAO
    _fuso(fuso_nome)  # valida

    cfg = _obter_ou_criar_config(db)
    cfg.ativo = bool(ativo)
    cfg.hora = int(hora)
    cfg.minuto = int(minuto)
    cfg.fuso = fuso_nome
    cfg.incluir_coleta = bool(incluir_coleta)
    cfg.incluir_cnpjs = bool(incluir_cnpjs)
    db.commit()
    db.refresh(cfg)
    return config_publica(db)


def _execucao_para_dict(row: AgendamentoExecucao) -> dict[str, Any]:
    log: list[str] = []
    detalhes: dict[str, Any] = {}
    if row.log_json:
        try:
            log = json.loads(row.log_json)
        except json.JSONDecodeError:
            log = [row.log_json]
    if row.detalhes_json:
        try:
            detalhes = json.loads(row.detalhes_json)
        except json.JSONDecodeError:
            detalhes = {"raw": row.detalhes_json}
    return {
        "id": row.id,
        "origem": row.origem,
        "ok": row.ok,
        "fase": row.fase,
        "resumo": row.resumo,
        "log": log,
        "detalhes": detalhes,
        "iniciado_em": row.iniciado_em.isoformat() if row.iniciado_em else None,
        "finalizado_em": row.finalizado_em.isoformat() if row.finalizado_em else None,
    }


def snapshot_status() -> dict[str, Any]:
    return dict(status)


def _persistir_execucao(
    *,
    execucao_id: int | None,
    ok: bool | None,
    fase: str,
    resumo: str | None,
    detalhes: dict[str, Any] | None = None,
    finalizar: bool = False,
) -> None:
    db = SessionLocal()
    try:
        row = db.get(AgendamentoExecucao, execucao_id) if execucao_id else None
        if row is None:
            return
        row.ok = ok
        row.fase = fase
        row.resumo = (resumo or "")[:500] if resumo else None
        row.log_json = json.dumps(status.get("log") or [], ensure_ascii=False)
        if detalhes is not None:
            row.detalhes_json = json.dumps(detalhes, ensure_ascii=False, default=str)
        if finalizar:
            row.finalizado_em = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
    finally:
        db.close()


def cadeia_ocupada() -> bool:
    if status.get("running"):
        return True
    if coleta_hub.status.get("running"):
        return True
    if status_job_pendentes_cnpj().get("running"):
        return True
    return False


def iniciar_cadeia(*, origem: str = "manual") -> dict[str, Any]:
    """Adquire o lock e prepara status. Levanta RuntimeError se já houver job."""
    with _lock:
        if cadeia_ocupada():
            raise RuntimeError(
                "Já existe uma cadeia, coleta ou job de CNPJs em andamento. "
                "Aguarde a conclusão antes de disparar outra."
            )

        db = SessionLocal()
        try:
            cfg = _obter_ou_criar_config(db)
            if not cfg.incluir_coleta and not cfg.incluir_cnpjs:
                raise RuntimeError("Nenhuma etapa da cadeia está habilitada na configuração")

            row = AgendamentoExecucao(
                origem=origem,
                ok=None,
                fase="iniciando",
                resumo="Cadeia iniciada",
                log_json="[]",
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            exec_id = row.id
            incluir_coleta = bool(cfg.incluir_coleta)
            incluir_cnpjs = bool(cfg.incluir_cnpjs)
        finally:
            db.close()

        agora = _agora_iso()
        status.update(
            running=True,
            fase="iniciando",
            origem=origem,
            log=[],
            resultado=None,
            execucao_id=exec_id,
            iniciado_em=agora,
            atualizado_em=agora,
            finalizado_em=None,
        )
        _log(f"Cadeia iniciada ({origem})")

    return {
        "status": "iniciada",
        "origem": origem,
        "execucao_id": exec_id,
        "incluir_coleta": incluir_coleta,
        "incluir_cnpjs": incluir_cnpjs,
    }


def executar_cadeia(*, origem: str = "manual") -> None:
    """Executa a cadeia de forma síncrona (usar em thread / BackgroundTasks)."""
    exec_id = status.get("execucao_id")
    detalhes: dict[str, Any] = {"etapas": {}}
    ok_final = False
    resumo = ""

    try:
        db = SessionLocal()
        try:
            cfg = _obter_ou_criar_config(db)
            incluir_coleta = bool(cfg.incluir_coleta)
            incluir_cnpjs = bool(cfg.incluir_cnpjs)
            params = params_coleta_padrao(db) if incluir_coleta else {}
        finally:
            db.close()

        coleta_ok = True

        if incluir_coleta:
            status["fase"] = "coleta"
            _log("── Etapa 1/2: coleta unificada ──")
            _persistir_execucao(
                execucao_id=exec_id,
                ok=None,
                fase="coleta",
                resumo="Executando coleta unificada",
            )

            fontes = list(params.get("fontes") or ["compras", "powerbi"])
            if coleta_hub.status.get("running"):
                if coleta_hub.is_stale():
                    coleta_hub.liberar_trava(
                        motivo="Trava órfã liberada pela cadeia de agendamento"
                    )
                else:
                    raise RuntimeError("Coleta unificada já em andamento")

            coleta_hub.preparar_status(fontes)
            coleta_hub.executar_coleta_unificada(
                fontes=fontes,
                ano=params.get("ano"),
                unidades=params.get("unidades"),
                fases=params.get("fases"),
                datasets=params.get("datasets"),
                anos=params.get("anos"),
            )
            snap = coleta_hub.snapshot_status()
            resultado = snap.get("resultado") or {}
            coleta_ok = bool(resultado.get("ok"))
            detalhes["etapas"]["coleta"] = {
                "ok": coleta_ok,
                "resultado": resultado,
                "fontes": fontes,
                "params": {
                    "ano": params.get("ano"),
                    "anos": params.get("anos"),
                    "fases": params.get("fases"),
                    "datasets": params.get("datasets"),
                    "unidades": params.get("unidades"),
                },
            }
            for linha in (snap.get("log") or [])[-40:]:
                _log(f"coleta · {linha}")

            if coleta_ok:
                _log("Coleta concluída com sucesso")
            else:
                erro = resultado.get("erro") or "Coleta falhou"
                _log(f"Coleta falhou: {erro}")
                raise RuntimeError(f"Coleta falhou — CNPJs não serão executados. {erro}")

        if incluir_cnpjs:
            if incluir_coleta and not coleta_ok:
                _log("CNPJs omitidos (coleta sem sucesso)")
            else:
                status["fase"] = "cnpjs"
                _log(
                    "── Etapa 2/2: CNPJs pendentes ──"
                    if incluir_coleta
                    else "── Etapa: CNPJs pendentes ──"
                )
                _persistir_execucao(
                    execucao_id=exec_id,
                    ok=None,
                    fase="cnpjs",
                    resumo="Enriquecendo CNPJs pendentes",
                    detalhes=detalhes,
                )
                iniciar_job_pendentes_cnpj()
                executar_job_pendentes_cnpj()
                st_cnpj = status_job_pendentes_cnpj()
                res_cnpj = st_cnpj.get("resultado") or {}
                cnpj_ok = bool(res_cnpj.get("ok"))
                detalhes["etapas"]["cnpjs"] = {
                    "ok": cnpj_ok,
                    "resultado": res_cnpj,
                }
                for linha in (st_cnpj.get("log") or [])[-40:]:
                    _log(f"cnpj · {linha}")
                if not cnpj_ok and not res_cnpj.get("cancelado"):
                    raise RuntimeError(
                        res_cnpj.get("erro") or "Job de CNPJs pendentes falhou"
                    )
                _log(res_cnpj.get("mensagem") or "CNPJs concluídos")

        ok_final = True
        partes = []
        if incluir_coleta:
            partes.append("coleta OK")
        if incluir_cnpjs:
            c = detalhes.get("etapas", {}).get("cnpjs", {}).get("resultado") or {}
            partes.append(
                f"CNPJs {c.get('ok_count', 0)} ok / {c.get('erros', 0)} erros"
                if c
                else "CNPJs OK"
            )
        resumo = " · ".join(partes) if partes else "Cadeia concluída"
        _log(f"Cadeia finalizada: {resumo}")

    except Exception as exc:  # noqa: BLE001 — status + persistência
        ok_final = False
        resumo = str(exc)[:500]
        _log(f"Falha na cadeia: {exc}")
        logger.exception("Falha na cadeia de agendamento")
        detalhes["erro"] = str(exc)
    finally:
        status["running"] = False
        status["fase"] = "idle"
        status["finalizado_em"] = _agora_iso()
        status["atualizado_em"] = status["finalizado_em"]
        status["resultado"] = {
            "ok": ok_final,
            "resumo": resumo,
            "detalhes": detalhes,
        }
        _persistir_execucao(
            execucao_id=exec_id,
            ok=ok_final,
            fase="idle",
            resumo=resumo,
            detalhes=detalhes,
            finalizar=True,
        )


def disparar_cadeia(*, origem: str = "manual") -> dict[str, Any]:
    """Inicia a cadeia em thread dedicada (não bloqueia o request)."""
    inicio = iniciar_cadeia(origem=origem)
    t = threading.Thread(
        target=executar_cadeia,
        kwargs={"origem": origem},
        name=f"agendamento-cadeia-{origem}",
        daemon=True,
    )
    t.start()
    return inicio


# --- Scheduler interno -------------------------------------------------------


def _tick_scheduler() -> None:
    chave: str | None = None
    db = SessionLocal()
    try:
        cfg = _obter_ou_criar_config(db)
        if not cfg.ativo:
            return
        if not cfg.incluir_coleta and not cfg.incluir_cnpjs:
            return

        tz = _fuso(cfg.fuso)
        agora = datetime.now(tz)
        if agora.hour != int(cfg.hora) or agora.minute != int(cfg.minuto):
            return

        chave = agora.strftime("%Y-%m-%d")
        if cfg.ultima_chave_dia == chave:
            return

        if cadeia_ocupada():
            logger.warning(
                "Agendamento %s %02d:%02d — cadeia/coleta já em andamento; tentará de novo",
                chave,
                cfg.hora,
                cfg.minuto,
            )
            return
    finally:
        db.close()

    if not chave:
        return

    logger.info("Disparo agendado da cadeia (chave_dia=%s)", chave)
    try:
        disparar_cadeia(origem="agendado")
    except RuntimeError as exc:
        logger.warning("Não foi possível disparar cadeia agendada: %s", exc)
        return

    db = SessionLocal()
    try:
        cfg = _obter_ou_criar_config(db)
        cfg.ultima_chave_dia = chave
        db.commit()
    finally:
        db.close()


def _scheduler_loop() -> None:
    logger.info("Scheduler de agendamento iniciado (poll=%ss)", SCHEDULER_POLL_SEC)
    while not _scheduler_stop.is_set():
        try:
            _tick_scheduler()
        except Exception:  # noqa: BLE001
            logger.exception("Erro no tick do scheduler de agendamento")
        _scheduler_stop.wait(SCHEDULER_POLL_SEC)
    logger.info("Scheduler de agendamento encerrado")


def iniciar_scheduler() -> None:
    """Idempotente — sobe a thread daemon se ainda não estiver ativa."""
    global _scheduler_thread
    with _lock:
        if _scheduler_thread is not None and _scheduler_thread.is_alive():
            return
        _scheduler_stop.clear()
        _scheduler_thread = threading.Thread(
            target=_scheduler_loop,
            name="agendamento-scheduler",
            daemon=True,
        )
        _scheduler_thread.start()


def parar_scheduler() -> None:
    global _scheduler_thread
    _scheduler_stop.set()
    t = _scheduler_thread
    if t is not None and t.is_alive():
        t.join(timeout=5)
    _scheduler_thread = None


# --- API (Setup / admin — prefixo já protegido pelo middleware) ---------------


router = APIRouter(prefix="/api/sistema/agendamento", tags=["agendamento"])


class AgendamentoConfigUpdate(BaseModel):
    ativo: bool = False
    hora: int = Field(default=2, ge=0, le=23)
    minuto: int = Field(default=0, ge=0, le=59)
    fuso: str = Field(default=FUSO_PADRAO, max_length=64)
    incluir_coleta: bool = True
    incluir_cnpjs: bool = True


@router.get("")
def obter_agendamento(db: Session = Depends(get_db)) -> dict:
    return config_publica(db)


@router.put("")
def atualizar_agendamento(
    body: AgendamentoConfigUpdate,
    db: Session = Depends(get_db),
) -> dict:
    try:
        return salvar_config(
            db,
            ativo=body.ativo,
            hora=body.hora,
            minuto=body.minuto,
            fuso=body.fuso,
            incluir_coleta=body.incluir_coleta,
            incluir_cnpjs=body.incluir_cnpjs,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.get("/status")
def status_agendamento(db: Session = Depends(get_db)) -> dict:
    """Status ao vivo + última execução persistida."""
    out = snapshot_status()
    out["config"] = config_publica(db)
    return out


@router.post("/rodar")
def rodar_cadeia_agora() -> dict:
    """Disparo manual da cadeia (Setup · Rodar agora)."""
    try:
        return disparar_cadeia(origem="manual")
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
