"""Services package. Prefer: from app.services.auth import SenderAuthService"""

from __future__ import annotations

import importlib
from typing import Any

_EXPORTS = {
    "SenderAuthService": "app.services.auth",
    "DispatchService": "app.services.dispatch",
    "IngestService": "app.services.ingest",
    "PairingService": "app.services.pairing",
    "RateLimiter": "app.services.rate_limit",
}

__all__ = list(_EXPORTS)


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module = importlib.import_module(_EXPORTS[name])
    return getattr(module, name)
