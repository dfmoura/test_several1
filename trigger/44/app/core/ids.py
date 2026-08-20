from __future__ import annotations

import re
import uuid


def new_id(prefix: str) -> str:
    try:
        import ulid

        return f"{prefix}_{ulid.new()}"
    except ImportError:
        return f"{prefix}_{uuid.uuid4().hex[:26].upper()}"


PHONE_RE = re.compile(r"^\d{10,15}$")


def normalize_phone(value: str) -> str:
    digits = re.sub(r"[^\d]", "", value or "")
    if digits.startswith("00"):
        digits = digits[2:]
    return digits


def validate_phone_e164(value: str) -> str:
    phone = normalize_phone(value)
    if not PHONE_RE.match(phone):
        raise ValueError(
            "invalid_phone: expected E.164 digits without '+', 10-15 length"
        )
    return phone


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ""
    digits = normalize_phone(phone)
    if len(digits) <= 6:
        return "****"
    return f"{digits[:4]}****{digits[-4:]}"


def truncate_body(body: str | None, max_len: int = 80) -> str:
    if not body:
        return ""
    if len(body) <= max_len:
        return body
    return body[:max_len] + "…"


def mask_email(email: str | None) -> str:
    if not email or "@" not in email:
        return ""
    user, domain = email.split("@", 1)
    if len(user) <= 2:
        return f"{user[:1]}***@{domain}"
    return f"{user[:2]}***@{domain}"
