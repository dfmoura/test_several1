from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Header, HTTPException, Request, status

from app.config import get_settings

API_KEY_PREFIX = "zpv_live_"
COOKIE_NAME = "zapvia_session"

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
except ImportError:  # pragma: no cover
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


def hash_secret(plaintext: str) -> str:
    if _USE_ARGON2:
        return _hasher.hash(plaintext)
    return _pbkdf2_hash(plaintext)


def verify_secret(plaintext: str, encoded: str) -> bool:
    if encoded.startswith("pbkdf2_sha256$"):
        return _pbkdf2_verify(plaintext, encoded)
    if not _USE_ARGON2:
        return False
    try:
        return _hasher.verify(encoded, plaintext)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_api_key() -> tuple[str, str, str]:
    raw = secrets.token_urlsafe(32)
    plaintext = f"{API_KEY_PREFIX}{raw}"
    key_hash = hash_secret(plaintext)
    display_prefix = plaintext[:16] + "…"
    return plaintext, key_hash, display_prefix


def verify_api_key(plaintext: str, key_hash: str) -> bool:
    return verify_secret(plaintext, key_hash)


def create_access_token(account_id: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": account_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_ttl_hours)).timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Sessão inválida ou expirada"},
        ) from exc
    sub = payload.get("sub")
    if not sub or payload.get("typ") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Sessão inválida"},
        )
    return str(sub)


def cookie_kwargs() -> dict:
    settings = get_settings()
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": settings.is_production,
        "max_age": settings.jwt_ttl_hours * 3600,
        "path": "/",
    }


def extract_bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


async def require_admin_token(
    authorization: Annotated[str | None, Header()] = None,
    x_admin_token: Annotated[str | None, Header(alias="X-Admin-Token")] = None,
) -> None:
    settings = get_settings()
    expected = settings.admin_token
    presented: str | None = None
    if x_admin_token:
        presented = x_admin_token
    else:
        presented = extract_bearer(authorization)

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


def extract_session_token(request: Request, authorization: str | None) -> str | None:
    bearer = extract_bearer(authorization)
    if bearer and not bearer.startswith(API_KEY_PREFIX):
        return bearer
    return request.cookies.get(COOKIE_NAME)
