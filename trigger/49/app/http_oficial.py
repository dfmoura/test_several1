from __future__ import annotations

import random
import time
from collections.abc import Callable
from typing import Any

import httpx

from app.config import (
    BACKOFF_BASE_S,
    BACKOFF_TETO_S,
    DELAY_S,
    RETRIES,
    TIMEOUT_LEITURA_S,
    USER_AGENT,
)

_RETRY = frozenset({429, 502, 503, 504})


def _espera_status(resposta: httpx.Response, tentativa: int) -> float:
    header = (resposta.headers.get("Retry-After") or "").strip()
    if header.isdigit():
        return max(1.0, float(header))
    return max(2.0, DELAY_S * 6 * tentativa)


def _espera_timeout(tentativa: int) -> float:
    espera = min(BACKOFF_TETO_S, BACKOFF_BASE_S * (2 ** max(0, tentativa - 1)))
    return espera + random.uniform(0.0, min(3.0, espera * 0.15))


class ClienteHttp:
    """Um cliente por faixa. Faixa A e Faixa B não compartilham cursor nem sessão."""

    def __init__(
        self,
        *,
        transporte: httpx.BaseTransport | None = None,
        dormir: Callable[[float], None] | None = None,
        tentativas: int = RETRIES,
    ) -> None:
        self._dormir = dormir or time.sleep
        self._tentativas = tentativas
        self._http = httpx.Client(
            transport=transporte,
            timeout=httpx.Timeout(connect=30.0, read=TIMEOUT_LEITURA_S, write=30.0, pool=30.0),
            follow_redirects=True,
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._http.close()

    def get_json(self, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        ultimo: Exception | None = None
        for tentativa in range(1, self._tentativas + 1):
            try:
                resposta = self._http.get(url, params=params or {})
            except (
                httpx.ReadTimeout,
                httpx.ConnectTimeout,
                httpx.ConnectError,
                httpx.RemoteProtocolError,
            ) as exc:
                ultimo = exc
                if tentativa >= self._tentativas:
                    break
                self._dormir(_espera_timeout(tentativa))
                continue
            if resposta.status_code == 403:
                raise RuntimeError("HTTP 403")
            if resposta.status_code in _RETRY:
                if tentativa >= self._tentativas:
                    raise RuntimeError(f"HTTP {resposta.status_code}")
                self._dormir(_espera_status(resposta, tentativa))
                continue
            if resposta.status_code == 404:
                raise RuntimeError("HTTP 404")
            if resposta.status_code >= 400:
                raise RuntimeError(f"HTTP {resposta.status_code}")
            if resposta.status_code == 204 or not resposta.content:
                return {}
            data = resposta.json()
            if not isinstance(data, dict):
                raise RuntimeError("resposta inválida")
            return data
        raise RuntimeError("timeout") from ultimo
