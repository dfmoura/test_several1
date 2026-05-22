"""Cliente HTTP para a API pública de contratos."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from contratos_consulta.config import BASE_URL, DEFAULT_TIMEOUT, USER_AGENT


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

    @property
    def is_auth_error(self) -> bool:
        return self.status_code in (401, 403)

    def pretty_json(self) -> str:
        if self.body_json is not None:
            return json.dumps(self.body_json, ensure_ascii=False, indent=2)
        return self.body_text


class ApiClient:
    """Executa requisições GET (consulta pública) sem credenciais."""

    def __init__(
        self,
        base_url: str = BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(
        self,
        method: str,
        url: str,
        *,
        json_body: dict[str, Any] | None = None,
    ) -> ApiResponse:
        method = method.upper()
        if method not in ("GET", "POST", "PUT", "DELETE"):
            raise ValueError(f"Método não suportado: {method}")

        headers = {
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        }
        if json_body is not None:
            headers["Content-Type"] = "application/json"

        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                )
            elapsed_ms = response.elapsed.total_seconds() * 1000
            text = response.text
            parsed: Any | None = None
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type or text.strip().startswith(("{", "[")):
                try:
                    parsed = response.json()
                except json.JSONDecodeError:
                    parsed = None

            return ApiResponse(
                ok=response.is_success,
                status_code=response.status_code,
                url=str(response.url),
                method=method,
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
                method=method,
                headers={},
                body_text="",
                body_json=None,
                elapsed_ms=0,
                error="Tempo limite da requisição excedido.",
            )
        except httpx.RequestError as exc:
            return ApiResponse(
                ok=False,
                status_code=0,
                url=url,
                method=method,
                headers={},
                body_text="",
                body_json=None,
                elapsed_ms=0,
                error=f"Erro de rede: {exc}",
            )

    def get(self, url: str) -> ApiResponse:
        return self.request("GET", url)
