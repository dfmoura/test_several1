"""Job em background: busca preços de mercado (IA) item a item — só Materiais.

Reutiliza ``analise_preco.executar_busca_mercado`` (mesma rotina do botão
*Buscar preços de mercado* em Propostas abertas). Processa apenas itens que
ainda **não** têm análise IA com status ``ok``. Cadência conservadora entre
itens para respeitar cota/tokens do Setup. Falha em um item não interrompe a fila.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any

from app.analise_preco import executar_busca_mercado
from app.config import MERCADO_IA_LOTE_INTERVALO_SEC
from app.database import SessionLocal
from app.propostas_abertas import listar_itens_materiais_propostas_abertas

_lock = threading.Lock()
_cancel = False

status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "cancelado": False,
    "intervalo_sec": MERCADO_IA_LOTE_INTERVALO_SEC,
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
            return {"ok": False, "mensagem": "Nenhum job de preços de mercado em andamento"}
        _cancel = True
        status["fase"] = "cancelando"
        _log("Cancelamento solicitado — conclui o item atual e encerra.")
        return {"ok": True, "mensagem": "Cancelamento solicitado"}


def iniciar_job() -> dict[str, Any]:
    global _cancel
    with _lock:
        if status.get("running"):
            raise RuntimeError("Já existe uma busca de preços de mercado em andamento")
        _cancel = False
        status.update(
            running=True,
            fase="preparando",
            cancelado=False,
            intervalo_sec=MERCADO_IA_LOTE_INTERVALO_SEC,
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
    return {"status": "iniciada", "intervalo_sec": MERCADO_IA_LOTE_INTERVALO_SEC}


def executar_job() -> None:
    """Processa Materiais de Propostas abertas, um a um. Rodar em thread / BackgroundTasks."""
    global _cancel
    try:
        db = SessionLocal()
        try:
            fila = listar_itens_materiais_propostas_abertas(db)
        finally:
            db.close()

        status["total"] = len(fila)
        status["fase"] = "buscando"
        _log(
            f"{len(fila)} material(is) sem preço de mercado IA · "
            f"intervalo {MERCADO_IA_LOTE_INTERVALO_SEC:g}s entre itens"
        )

        if not fila:
            status["resultado"] = {
                "ok": True,
                "mensagem": (
                    "Nenhum Material pendente de preço de mercado IA "
                    "(todos já analisados ou sem itens abertos)"
                ),
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

            item_id = int(item["item_id"])
            rotulo = item.get("descricao") or item.get("id_compra_item") or f"#{item_id}"
            status["atual"] = {
                "item_id": item_id,
                "id_compra_item": item.get("id_compra_item"),
                "descricao": item.get("descricao"),
                "indice": idx + 1,
            }
            status["fase"] = "buscando"
            _log(f"({idx + 1}/{len(fila)}) Buscando mercado · item {item_id} · {rotulo}")

            db = SessionLocal()
            try:
                row = executar_busca_mercado(db, item_id, usuario=None)
                if row.status == "ok":
                    status["ok"] = int(status.get("ok") or 0) + 1
                    _log(f"({idx + 1}/{len(fila)}) OK · item {item_id}")
                else:
                    status["erros"] = int(status.get("erros") or 0) + 1
                    status["ultimo_erro"] = row.erro or "Análise com status de erro"
                    _log(
                        f"({idx + 1}/{len(fila)}) Erro · item {item_id}: "
                        f"{status['ultimo_erro']}"
                    )
            except Exception as exc:  # noqa: BLE001 — isola falha por item
                status["erros"] = int(status.get("erros") or 0) + 1
                status["ultimo_erro"] = str(exc)
                _log(f"({idx + 1}/{len(fila)}) Falha · item {item_id}: {exc}")
            finally:
                db.close()
                status["processados"] = int(status.get("processados") or 0) + 1
                status["atualizado_em"] = _now_iso()

            if idx < len(fila) - 1 and not _cancel:
                time.sleep(max(0.0, MERCADO_IA_LOTE_INTERVALO_SEC))

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
                else "Busca de preços de mercado (Materiais) concluída"
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
