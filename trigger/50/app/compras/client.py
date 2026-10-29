"""Cliente HTTP Compras.gov — paginação, retry, delay (padrão trigger/23)."""

from __future__ import annotations

import random
import re
import time
from typing import Any, Callable, Iterator

import httpx

from app.config import (
    COMPRAS_PNCP_HTTP_TIMEOUT_SEC,
    COMPRAS_PNCP_MAX_RETRIES,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    COMPRAS_PNCP_TIMEOUT_BACKOFF_BASE_SEC,
    COMPRAS_PNCP_TIMEOUT_BACKOFF_CAP_SEC,
    USER_AGENT,
)

_RETRYABLE_STATUS = frozenset({429, 502, 503, 504})
_RETRY_IN_RE = re.compile(r"try again in\s+(\d+)\s+seconds?", re.IGNORECASE)


def httpx_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        connect=30.0,
        read=COMPRAS_PNCP_HTTP_TIMEOUT_SEC,
        write=30.0,
        pool=30.0,
    )


def espera_retry_http(resp: httpx.Response, *, tentativa: int) -> float:
    header = (resp.headers.get("Retry-After") or "").strip()
    if header.isdigit():
        return max(1.0, float(header))
    texto = (resp.text or "")[:400]
    m = _RETRY_IN_RE.search(texto)
    if m:
        return max(1.0, float(m.group(1)) + 0.5)
    return max(2.0, COMPRAS_PNCP_REQUEST_DELAY_SEC * 6 * tentativa)


def espera_retry_timeout(*, tentativa: int) -> float:
    base = max(1.0, COMPRAS_PNCP_TIMEOUT_BACKOFF_BASE_SEC)
    cap = max(base, COMPRAS_PNCP_TIMEOUT_BACKOFF_CAP_SEC)
    espera = min(cap, base * (2 ** max(0, tentativa - 1)))
    return espera + random.uniform(0.0, min(3.0, espera * 0.15))


class ComprasGovClient:
    def __init__(self, *, on_log: Callable[[str], None] | None = None) -> None:
        self._on_log = on_log
        self._http = httpx.Client(
            timeout=httpx_timeout(),
            follow_redirects=True,
            headers={"Accept": "*/*", "User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> ComprasGovClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def get_json(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        contexto: str = "API Compras.gov",
    ) -> dict[str, Any]:
        for tentativa in range(1, COMPRAS_PNCP_MAX_RETRIES + 1):
            try:
                resp = self._http.get(url, params=params or {})
            except (
                httpx.ReadTimeout,
                httpx.ConnectTimeout,
                httpx.WriteTimeout,
                httpx.PoolTimeout,
                httpx.ConnectError,
                httpx.RemoteProtocolError,
            ) as exc:
                if tentativa >= COMPRAS_PNCP_MAX_RETRIES:
                    raise RuntimeError(
                        f"{contexto}: timeout após {COMPRAS_PNCP_MAX_RETRIES} tentativa(s)"
                    ) from exc
                espera = espera_retry_timeout(tentativa=tentativa)
                if self._on_log:
                    self._on_log(
                        f"Timeout ({exc.__class__.__name__}); "
                        f"tentativa {tentativa}/{COMPRAS_PNCP_MAX_RETRIES}"
                    )
                time.sleep(espera)
                continue

            if resp.status_code == 403:
                raise RuntimeError(f"{contexto} HTTP 403 — verifique User-Agent")

            if resp.status_code in _RETRYABLE_STATUS:
                if tentativa >= COMPRAS_PNCP_MAX_RETRIES:
                    raise RuntimeError(
                        f"{contexto} HTTP {resp.status_code}: {resp.text[:300]}"
                    )
                espera = espera_retry_http(resp, tentativa=tentativa)
                if self._on_log:
                    self._on_log(
                        f"HTTP {resp.status_code}; tentativa {tentativa}/"
                        f"{COMPRAS_PNCP_MAX_RETRIES}"
                    )
                time.sleep(espera)
                continue

            if resp.status_code >= 400:
                raise RuntimeError(f"{contexto} HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            if not isinstance(data, dict):
                raise RuntimeError(f"{contexto}: resposta inválida")
            return data

        raise RuntimeError(f"{contexto}: falha inesperada na requisição")

    def paginar(
        self,
        url: str,
        *,
        params_base: dict[str, Any],
        contexto: str,
        tamanho_pagina: int,
    ) -> Iterator[dict[str, Any]]:
        pagina = 1
        total_paginas = 1
        while pagina <= total_paginas:
            params = {**params_base, "pagina": pagina, "tamanhoPagina": tamanho_pagina}
            payload = self.get_json(url, params=params, contexto=contexto)
            total_paginas = int(payload.get("totalPaginas") or 1)
            registros = payload.get("resultado") or []
            if not isinstance(registros, list):
                registros = []
            for raw in registros:
                if isinstance(raw, dict):
                    yield raw
            if pagina >= total_paginas or not registros:
                break
            pagina += 1
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
