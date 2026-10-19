from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")


def agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def agora_negocio() -> datetime:
    return datetime.now(FUSO)
