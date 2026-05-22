"""Cliente HTTP para a API de Dados Abertos — Compras.gov.br."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from compras_consulta.config import BASE_URL, DEFAULT_TIMEOUT, USER_AGENT


@dataclass
class ApiResponse:
    ok: bool
    status_code: int
    url: str
    method: str
    headers: dict[str, str]
    body_text: str
    body_json: Any | None
    elapsed_ms: float
    error: str | None = None

    def pretty_json(self) -> str:
        if self.body_json is not None:
            return json.dumps(self.body_json, ensure_ascii=False, indent=2)
        return self.body_text


class ApiClient:
    def __init__(
        self,
        base_url: str = BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get(self, url: str) -> ApiResponse:
        headers = {
            "Accept": "application/json, text/csv, */*",
            "User-Agent": USER_AGENT,
        }
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
            elapsed_ms = response.elapsed.total_seconds() * 1000
            text = response.text
            parsed: Any | None = None
            content_type = response.headers.get("content-type", "")
            if "json" in content_type or text.strip().startswith(("{", "[")):
                try:
                    parsed = response.json()
                except json.JSONDecodeError:
                    parsed = None
            return ApiResponse(
                ok=response.is_success,
                status_code=response.status_code,
                url=str(response.url),
                method="GET",
                headers=dict(response.headers),
                body_text=text,
                body_json=parsed,
                elapsed_ms=elapsed_ms,
            )
        except httpx.TimeoutException:
            return ApiResponse(
                ok=False,
                status_code=0,
                url=url,
                method="GET",
                headers={},
                body_text="",
                body_json=None,
                elapsed_ms=0,
                error="Tempo limite excedido. Tente filtros mais restritos ou aumente o timeout.",
            )
        except httpx.RequestError as exc:
            return ApiResponse(
                ok=False,
                status_code=0,
                url=url,
                method="GET",
                headers={},
                body_text="",
                body_json=None,
                elapsed_ms=0,
                error=f"Erro de rede: {exc}",
            )
