"""Garante DISPLAY para Playwright headed (HEADLESS=false) em ambientes sem X server."""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time

_lock = threading.Lock()
_xvfb_proc: subprocess.Popen[bytes] | None = None


def ensure_virtual_display() -> str | None:
    """
    Inicia Xvfb quando HEADLESS=false e não há DISPLAY (Linux/Docker sem GUI).
    Retorna DISPLAY configurado, ou None se modo headless.
    """
    global _xvfb_proc

    if os.environ.get("HEADLESS", "false").lower() in ("1", "true", "yes"):
        return os.environ.get("DISPLAY")

    if os.environ.get("DISPLAY"):
        return os.environ["DISPLAY"]

    with _lock:
        if os.environ.get("DISPLAY"):
            return os.environ["DISPLAY"]

        xvfb = shutil.which("Xvfb")
        if not xvfb:
            raise RuntimeError(
                "Coleta da Prefeitura exige navegador visível (HEADLESS=false), "
                "mas não há DISPLAY nem Xvfb instalado. "
                "Instale: sudo apt install xvfb — ou use Docker: docker compose up --build -d"
            )

        display = ":99"
        if _xvfb_proc is None or _xvfb_proc.poll() is not None:
            _xvfb_proc = subprocess.Popen(
                [xvfb, display, "-ac", "-screen", "0", "1400x900x24", "-nolisten", "tcp"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            for _ in range(20):
                if os.path.exists("/tmp/.X11-unix/X99"):
                    break
                time.sleep(0.25)
            if _xvfb_proc.poll() is not None:
                raise RuntimeError("Xvfb não iniciou. Verifique: apt install xvfb")

        os.environ["DISPLAY"] = display
        return display
