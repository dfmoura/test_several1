"""Hash e verificação de senhas (bcrypt)."""

from __future__ import annotations

import bcrypt

# bcrypt aceita no máximo 72 bytes.
_MAX_SENHA_BYTES = 72


def _senha_bytes(senha: str) -> bytes:
    raw = senha.encode("utf-8")
    if len(raw) > _MAX_SENHA_BYTES:
        raise ValueError("Senha muito longa (máximo 72 bytes).")
    return raw


def hash_senha(senha: str) -> str:
    if not senha or len(senha) < 6:
        raise ValueError("Senha deve ter ao menos 6 caracteres.")
    digest = bcrypt.hashpw(_senha_bytes(senha), bcrypt.gensalt(rounds=12))
    return digest.decode("ascii")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    if not senha or not senha_hash:
        return False
    try:
        return bcrypt.checkpw(_senha_bytes(senha), senha_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False
