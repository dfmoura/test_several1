"""Job de CNPJs pendentes — status consultável pela UI."""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any

from app import database as dbmod
from app.enriquecimento.service import processar_pendentes_cnpj

_lock = threading.Lock()

status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "total": 0,
    "processados": 0,
    "ok": 0,
    "erros": 0,
    "atual": None,
    "ultimo_erro": None,
    "log": [],
    "iniciado_em": None,
    "resultado": None,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _log(msg: str) -> None:
    linha = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    logs = status.get("log") or []
    status["log"] = ([*logs, linha])[-60:]


def status_publico() -> dict[str, Any]:
    return dict(status)


def iniciar_e_executar(*, limit: int = 50) -> dict[str, Any]:
    """Processa a fila de pendentes (síncrono; lotes pequenos / Lightsail)."""
    with _lock:
        if status.get("running"):
            raise RuntimeError("Já existe um job de enriquecimento em andamento.")
        status.update(
            running=True,
            fase="enriquecendo",
            total=0,
            processados=0,
            ok=0,
            erros=0,
            atual=None,
            ultimo_erro=None,
            log=[],
            iniciado_em=_now_iso(),
            resultado=None,
        )

    # SessionLocal em runtime (testes reapontam via configure_engine).
    db = dbmod.SessionLocal()
    try:

        def on_item(ni: str, ok: bool, erro: str | None) -> None:
            status["processados"] = int(status.get("processados") or 0) + 1
            status["atual"] = ni
            if ok:
                status["ok"] = int(status.get("ok") or 0) + 1
                _log(f"OK {ni}")
            else:
                status["erros"] = int(status.get("erros") or 0) + 1
                status["ultimo_erro"] = erro
                _log(f"ERRO {ni}: {(erro or '')[:120]}")

        result = processar_pendentes_cnpj(db, limit=limit, on_item=on_item)
        status["total"] = result.get("total", 0)
        status["resultado"] = result
        status["fase"] = "concluido"
        _log(
            f"Concluído: {result.get('ok_count', 0)} ok / {result.get('erros', 0)} erro(s)"
        )
        return result
    finally:
        db.close()
        status["running"] = False
        status["atual"] = None
