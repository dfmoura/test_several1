"""Criptografia de API keys de IA em repouso (Fernet).

A key Fernet vem de ``IA_TOKEN_SECRET`` (env) ou de ``data/.ia_fernet_key``
(gerado na primeira necessidade). Nunca logar o plaintext da API key.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import DATA_DIR, IA_TOKEN_SECRET

logger = logging.getLogger(__name__)

_SECRET_FILE = DATA_DIR / ".ia_fernet_key"


def _normalizar_secret(raw: str) -> bytes:
    """Aceita chave Fernet URL-safe (44 bytes) ou deriva a partir de texto livre."""
    texto = (raw or "").strip()
    if not texto:
        raise ValueError("Segredo de criptografia vazio.")
    # Fernet keys are 32 url-safe base64-encoded bytes → length 44.
    if len(texto) == 44:
        try:
            Fernet(texto.encode("ascii"))
            return texto.encode("ascii")
        except (ValueError, TypeError):
            pass
    # Deriva chave estável a partir de senha (PBKDF2 via Fernet.generate_key não;
    # usamos hashlib + base64 para material de 32 bytes).
    import base64
    import hashlib

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        texto.encode("utf-8"),
        b"observatorio-ia-token-v1",
        120_000,
        dklen=32,
    )
    return base64.urlsafe_b64encode(digest)


def _carregar_ou_criar_arquivo() -> bytes:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _SECRET_FILE.is_file():
        raw = _SECRET_FILE.read_text(encoding="utf-8").strip()
        if raw:
            return _normalizar_secret(raw)
    key = Fernet.generate_key()
    _SECRET_FILE.write_text(key.decode("ascii") + "\n", encoding="utf-8")
    try:
        _SECRET_FILE.chmod(0o600)
    except OSError:
        pass
    logger.info("Chave Fernet de IA criada em %s", _SECRET_FILE.name)
    return key


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    if IA_TOKEN_SECRET:
        return Fernet(_normalizar_secret(IA_TOKEN_SECRET))
    return Fernet(_carregar_ou_criar_arquivo())


def mascarar_api_key(api_key: str) -> str:
    """Máscara estável para UI — nunca retorna a key completa."""
    key = (api_key or "").strip()
    if not key:
        return ""
    if len(key) <= 8:
        return "••••" + key[-2:]
    return f"{key[:4]}…{key[-4:]}"


def criptografar_api_key(api_key: str) -> str:
    plain = (api_key or "").strip()
    if not plain:
        raise ValueError("API key vazia.")
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def descriptografar_api_key(token: str) -> str:
    if not token:
        raise ValueError("Token criptografado vazio.")
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError(
            "Não foi possível descriptografar a API key "
            "(segredo IA_TOKEN_SECRET / .ia_fernet_key incompatível)."
        ) from exc


def reset_fernet_cache() -> None:
    """Útil em testes após alterar o segredo."""
    _fernet.cache_clear()
