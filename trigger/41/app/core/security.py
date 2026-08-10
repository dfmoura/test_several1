from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import get_settings

API_KEY_PREFIX = "zpg_live_"

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    _hasher = PasswordHasher(
        time_cost=2,
        memory_cost=65536,
        parallelism=2,
        hash_len=32,
        salt_len=16,
    )
    _USE_ARGON2 = True
except ImportError:  # pragma: no cover - fallback for slim test envs
    _USE_ARGON2 = False
    VerifyMismatchError = Exception  # type: ignore[misc, assignment]


def _pbkdf2_hash(plaintext: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", plaintext.encode(), salt, 260_000)
    return f"pbkdf2_sha256$260000${salt.hex()}${dk.hex()}"


def _pbkdf2_verify(plaintext: str, encoded: str) -> bool:
    try:
        algo, rounds, salt_hex, hash_hex = encoded.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            plaintext.encode(),
            bytes.fromhex(salt_hex),
            int(rounds),
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def generate_api_key() -> tuple[str, str, str]:
    """Return (plaintext, hash, display_prefix)."""
    raw = secrets.token_urlsafe(32)
    plaintext = f"{API_KEY_PREFIX}{raw}"
    if _USE_ARGON2:
        key_hash = _hasher.hash(plaintext)
    else:
        key_hash = _pbkdf2_hash(plaintext)
    display_prefix = plaintext[:16] + "…"
    return plaintext, key_hash, display_prefix


def verify_api_key(plaintext: str, key_hash: str) -> bool:
    if key_hash.startswith("pbkdf2_sha256$"):
        return _pbkdf2_verify(plaintext, key_hash)
    if not _USE_ARGON2:
        return False
    try:
        return _hasher.verify(key_hash, plaintext)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


async def require_admin_token(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_token: Annotated[str | None, Header(alias="X-Admin-Token")] = None,
) -> None:
    settings = get_settings()
    expected = settings.admin_token
    presented: str | None = None

    if x_admin_token:
        presented = x_admin_token
    elif authorization and authorization.lower().startswith("bearer "):
        presented = authorization[7:].strip()

    if not expected or expected.startswith("change-me"):
        if settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ADMIN_TOKEN must be configured in production",
            )

    if not presented or not hmac.compare_digest(presented, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )


async def validate_webhook_secret(
    x_webhook_secret: Annotated[str | None, Header(alias="X-Webhook-Secret")] = None,
) -> None:
    """Optional shared secret for Evolution webhook (best-effort)."""
    settings = get_settings()
    expected = settings.webhook_secret
    if not expected or expected.startswith("change-me"):
        if settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="WEBHOOK_SECRET must be set in production",
            )
        return
    if x_webhook_secret is not None and not hmac.compare_digest(
        x_webhook_secret, expected
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )
