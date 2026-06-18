"""Cliente HTTP Inter (Trigger TI) — OAuth mTLS + API Cobrança v3.

Separado da integração Inter que cada condomínio usa no app Android.
"""

from __future__ import annotations

import threading
import time
from typing import Any

import httpx

PRODUCTION_BASE = "https://cdpj.partners.bancointer.com.br"
SANDBOX_BASE = "https://cdpj-sandbox.partners.uatinter.co"

_TOKEN_CACHE: dict[str, tuple[str, float]] = {}
_TOKEN_LOCKS: dict[str, threading.Lock] = {}
_META_LOCK = threading.Lock()
_TOKEN_MARGIN_SECONDS = 120.0


class InterClientError(Exception):
    pass


def _oauth_cache_key(base_url: str, client_id: str, scopes: str) -> str:
    return f"{base_url}|{client_id}|{scopes}"


def _lock_for_key(key: str) -> threading.Lock:
    with _META_LOCK:
        lock = _TOKEN_LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _TOKEN_LOCKS[key] = lock
        return lock


def clear_inter_oauth_cache() -> None:
    """Invalida tokens em memória (ex.: após trocar Client Secret)."""
    with _META_LOCK:
        _TOKEN_CACHE.clear()


def normalize_conta_corrente(raw: str | None) -> str | None:
    """Inter exige x-conta-corrente só com dígitos: [1-9]\\d* (conta+dígito, sem hífen)."""
    if not raw:
        return None
    digits = "".join(ch for ch in str(raw).strip() if ch.isdigit())
    if not digits:
        return None
    digits = digits.lstrip("0")
    if not digits or digits[0] == "0":
        return None
    return digits


class InterClient:
    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        cert_path: str,
        key_path: str,
        conta_corrente: str | None = None,
        sandbox: bool = False,
        scopes: str = "boleto-cobranca.read boleto-cobranca.write",
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.cert_path = cert_path
        self.key_path = key_path
        self.conta_corrente = normalize_conta_corrente(conta_corrente)
        self.base_url = SANDBOX_BASE if sandbox else PRODUCTION_BASE
        self.scopes = scopes.strip()
        self._token: str | None = None
        self._token_expires_at = 0.0

    def _http(self) -> httpx.Client:
        return httpx.Client(
            cert=(self.cert_path, self.key_path),
            timeout=httpx.Timeout(45.0),
        )

    def _auth_headers(self) -> dict[str, str]:
        token = self._obtain_token()
        headers = {"Authorization": f"Bearer {token}"}
        if self.conta_corrente:
            headers["x-conta-corrente"] = self.conta_corrente
        return headers

    def _read_cached_token(self, cache_key: str, now: float) -> str | None:
        cached = _TOKEN_CACHE.get(cache_key)
        if cached:
            token, expires_at = cached
            if now < expires_at - _TOKEN_MARGIN_SECONDS:
                self._token = token
                self._token_expires_at = expires_at
                return token
        if self._token and now < self._token_expires_at - _TOKEN_MARGIN_SECONDS:
            return self._token
        return None

    def _store_cached_token(self, cache_key: str, token: str, expires_at: float) -> str:
        self._token = token
        self._token_expires_at = expires_at
        _TOKEN_CACHE[cache_key] = (token, expires_at)
        return token

    def _obtain_token(self) -> str:
        now = time.time()
        cache_key = _oauth_cache_key(self.base_url, self.client_id, self.scopes)
        cached_token = self._read_cached_token(cache_key, now)
        if cached_token:
            return cached_token

        lock = _lock_for_key(cache_key)
        with lock:
            cached_token = self._read_cached_token(cache_key, now)
            if cached_token:
                return cached_token

            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
                "scope": self.scopes,
            }
            with self._http() as client:
                response = client.post(f"{self.base_url}/oauth/v2/token", data=data)
                if response.status_code == 429:
                    stale = _TOKEN_CACHE.get(cache_key)
                    if stale and now < stale[1]:
                        return self._store_cached_token(cache_key, stale[0], stale[1])
                    retry_after = response.headers.get("Retry-After", "60").strip() or "60"
                    raise InterClientError(
                        "OAuth 429: limite de requisições de token do Inter. "
                        f"Aguarde {retry_after}s e tente novamente."
                    )
                if response.status_code >= 400:
                    detail = response.text.strip() or response.reason_phrase
                    raise InterClientError(f"OAuth {response.status_code}: {detail}")
                payload = response.json()
                expires_at = now + float(payload.get("expires_in", 3600))
                return self._store_cached_token(
                    cache_key,
                    payload["access_token"],
                    expires_at,
                )

    def ping(self) -> dict[str, str]:
        """Valida OAuth e, se houver conta, um GET na API de cobrança (exige x-conta-corrente)."""
        headers = self._auth_headers()
        result: dict[str, str] = {"ok": "true", "base_url": self.base_url}
        if not self.conta_corrente:
            result["warning"] = (
                "Conta corrente não configurada — obrigatória para consultar, cancelar e PDF."
            )
            return result
        result["conta_corrente"] = self.conta_corrente
        with self._http() as client:
            response = client.get(
                f"{self.base_url}/cobranca/v3/cobrancas/webhook",
                headers=headers,
            )
            if response.status_code == 401:
                raise InterClientError(
                    "API Cobrança 401: conta corrente inválida ou credenciais sem permissão. "
                    f"Confira x-conta-corrente (use conta+dígito sem hífen, ex.: 538375221). "
                    f"Conta atual: {self.conta_corrente}. Detalhe: {response.text}"
                )
            if response.status_code not in (200, 404):
                raise InterClientError(
                    f"Testar API Cobrança {response.status_code}: {response.text}"
                )
        return result

    def emitir_cobranca(self, body: dict[str, Any]) -> dict[str, Any]:
        with self._http() as client:
            response = client.post(
                f"{self.base_url}/cobranca/v3/cobrancas",
                headers={**self._auth_headers(), "Content-Type": "application/json"},
                json=body,
            )
            if response.status_code >= 400:
                raise InterClientError(f"Emitir cobrança {response.status_code}: {response.text}")
            return response.json()

    def cancelar_cobranca(
        self,
        codigo_solicitacao: str,
        motivo: str = "Cancelamento solicitado pelo emissor",
    ) -> dict[str, Any]:
        codigo = codigo_solicitacao.strip()
        if not codigo:
            raise InterClientError("codigoSolicitacao vazio para cancelamento.")
        body = {"motivoCancelamento": (motivo or "Cancelamento solicitado pelo emissor")[:50]}
        with self._http() as client:
            response = client.post(
                f"{self.base_url}/cobranca/v3/cobrancas/{codigo}/cancelar",
                headers={**self._auth_headers(), "Content-Type": "application/json"},
                json=body,
            )
            if response.status_code >= 400:
                raise InterClientError(
                    f"Cancelar cobrança {response.status_code}: {response.text}"
                )
            if response.status_code not in (200, 201, 202, 204):
                raise InterClientError(
                    f"Cancelar cobrança retornou status inesperado {response.status_code}: {response.text}"
                )
            if response.text.strip():
                try:
                    return response.json()
                except ValueError:
                    return {"codigoSolicitacao": codigo, "cancelado": True, "raw": response.text}
            return {"codigoSolicitacao": codigo, "cancelado": True}

    def get_cobranca(self, codigo_solicitacao: str) -> dict[str, Any]:
        with self._http() as client:
            response = client.get(
                f"{self.base_url}/cobranca/v3/cobrancas/{codigo_solicitacao}",
                headers=self._auth_headers(),
            )
            if response.status_code >= 400:
                raise InterClientError(f"Consultar cobrança {response.status_code}: {response.text}")
            return response.json()

    def pdf_cobranca(self, codigo_solicitacao: str) -> str:
        with self._http() as client:
            response = client.get(
                f"{self.base_url}/cobranca/v3/cobrancas/{codigo_solicitacao}/pdf",
                headers=self._auth_headers(),
            )
            if response.status_code >= 400:
                raise InterClientError(f"PDF cobrança {response.status_code}: {response.text}")
            payload = response.json()
            pdf = payload.get("pdf")
            if not pdf:
                raise InterClientError("Resposta PDF sem campo pdf.")
            return pdf

    def register_webhook(self, callback_url: str) -> dict[str, Any]:
        with self._http() as client:
            response = client.put(
                f"{self.base_url}/cobranca/v3/cobrancas/webhook",
                headers={**self._auth_headers(), "Content-Type": "application/json"},
                json={"webhookUrl": callback_url},
            )
            if response.status_code >= 400:
                raise InterClientError(f"Registrar webhook {response.status_code}: {response.text}")
            if response.text.strip():
                return response.json()
            return {"webhookUrl": callback_url}

    def get_webhook(self) -> str | None:
        with self._http() as client:
            response = client.get(
                f"{self.base_url}/cobranca/v3/cobrancas/webhook",
                headers=self._auth_headers(),
            )
            if response.status_code == 404:
                return None
            if response.status_code >= 400:
                raise InterClientError(f"Consultar webhook {response.status_code}: {response.text}")
            payload = response.json()
            if isinstance(payload, str):
                return payload
            return payload.get("webhookUrl") or payload.get("webhook_url")
