"""Job em background: enriquece CNPJs vencedores com cache pendente.

Cadência conservadora (padrão 3s entre requisições) para reduzir risco de
bloqueio nas APIs públicas. Usa o mesmo caminho de upsert de
``obter_fornecedor_detalhe`` — um CNPJ por vez, commit isolado.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any

from app.compras.cnpj_publico import obter_fornecedor_detalhe
from app.compras.vencedores_cnpj import listar_pendentes_enriquecimento
from app.config import CNPJ_PUBLICO_LOTE_BACKOFF_SEC, CNPJ_PUBLICO_LOTE_INTERVALO_SEC
from app.database import SessionLocal

_lock = threading.Lock()
_cancel = False

status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "cancelado": False,
    "intervalo_sec": CNPJ_PUBLICO_LOTE_INTERVALO_SEC,
    "total": 0,
    "processados": 0,
    "ok": 0,
    "erros": 0,
    "atual": None,
    "ultimo_erro": None,
    "log": [],
    "iniciado_em": None,
    "atualizado_em": None,
    "resultado": None,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _log(msg: str) -> None:
    linha = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    logs = status.get("log") or []
    logs = ([*logs, linha])[-80:]
    status["log"] = logs
    status["atualizado_em"] = _now_iso()


def status_publico() -> dict[str, Any]:
    return dict(status)


def pedir_cancelamento() -> dict[str, Any]:
    global _cancel
    with _lock:
        if not status.get("running"):
            return {"ok": False, "mensagem": "Nenhum job de pendentes em andamento"}
        _cancel = True
        status["fase"] = "cancelando"
        _log("Cancelamento solicitado — conclui o item atual e encerra.")
        return {"ok": True, "mensagem": "Cancelamento solicitado"}


def iniciar_job() -> dict[str, Any]:
    global _cancel
    with _lock:
        if status.get("running"):
            raise RuntimeError("Já existe uma atualização de pendentes em andamento")
        _cancel = False
        status.update(
            running=True,
            fase="preparando",
            cancelado=False,
            intervalo_sec=CNPJ_PUBLICO_LOTE_INTERVALO_SEC,
            total=0,
            processados=0,
            ok=0,
            erros=0,
            atual=None,
            ultimo_erro=None,
            log=[],
            iniciado_em=_now_iso(),
            atualizado_em=_now_iso(),
            resultado=None,
        )
    return {"status": "iniciada", "intervalo_sec": CNPJ_PUBLICO_LOTE_INTERVALO_SEC}


def executar_job() -> None:
    """Processa a fila de pendentes. Deve rodar em BackgroundTasks."""
    global _cancel
    try:
        db = SessionLocal()
        try:
            fila = listar_pendentes_enriquecimento(db)
        finally:
            db.close()

        status["total"] = len(fila)
        status["fase"] = "enriquecendo"
        _log(
            f"{len(fila)} CNPJ(s) pendente(s) · intervalo {CNPJ_PUBLICO_LOTE_INTERVALO_SEC:g}s "
            f"entre consultas"
        )

        if not fila:
            status["resultado"] = {
                "ok": True,
                "mensagem": "Nenhum CNPJ pendente para enriquecer",
                "total": 0,
                "ok_count": 0,
                "erros": 0,
            }
            return

        for idx, item in enumerate(fila):
            if _cancel:
                status["cancelado"] = True
                _log("Job interrompido a pedido do usuário.")
                break

            ni = item["cod_fornecedor"]
            nome = item.get("nome_fornecedor")
            status["atual"] = {"cod_fornecedor": ni, "nome_fornecedor": nome, "indice": idx + 1}
            status["fase"] = "enriquecendo"
            _log(f"({idx + 1}/{len(fila)}) Consultando {ni}…")

            db = SessionLocal()
            try:
                obter_fornecedor_detalhe(db, ni, refresh=True, nome_hint=nome)
                status["ok"] = int(status.get("ok") or 0) + 1
                _log(f"({idx + 1}/{len(fila)}) OK · {ni}")
            except LookupError as exc:
                status["erros"] = int(status.get("erros") or 0) + 1
                status["ultimo_erro"] = str(exc)
                _log(f"({idx + 1}/{len(fila)}) Não encontrado · {ni}: {exc}")
            except Exception as exc:  # noqa: BLE001 — isola falha por CNPJ
                status["erros"] = int(status.get("erros") or 0) + 1
                status["ultimo_erro"] = str(exc)
                _log(f"({idx + 1}/{len(fila)}) Erro · {ni}: {exc}")
                # Backoff conservador em falha de API (possível rate limit).
                time.sleep(max(0.0, CNPJ_PUBLICO_LOTE_BACKOFF_SEC))
            finally:
                db.close()
                status["processados"] = int(status.get("processados") or 0) + 1
                status["atualizado_em"] = _now_iso()

            # Cadência entre requisições (não após o último, se for cancelar rápido).
            if idx < len(fila) - 1 and not _cancel:
                time.sleep(max(0.0, CNPJ_PUBLICO_LOTE_INTERVALO_SEC))

        status["resultado"] = {
            "ok": not status.get("cancelado"),
            "cancelado": bool(status.get("cancelado")),
            "total": status.get("total"),
            "processados": status.get("processados"),
            "ok_count": status.get("ok"),
            "erros": status.get("erros"),
            "mensagem": (
                "Cancelado pelo usuário"
                if status.get("cancelado")
                else "Atualização de pendentes concluída"
            ),
        }
        _log(status["resultado"]["mensagem"])
    except Exception as exc:  # noqa: BLE001
        status["resultado"] = {"ok": False, "erro": str(exc)}
        _log(f"Falha no job: {exc}")
    finally:
        status["running"] = False
        status["fase"] = "idle"
        status["atual"] = None
        status["atualizado_em"] = _now_iso()
        _cancel = False
