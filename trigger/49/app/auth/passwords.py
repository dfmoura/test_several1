from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError

_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def hash_senha(senha: str) -> str:
    if not senha or len(senha) < 8:
        raise ValueError("Senha deve ter ao menos 8 caracteres.")
    return _hasher.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    if not senha or not senha_hash:
        return False
    try:
        return _hasher.verify(senha_hash, senha)
    except (VerifyMismatchError, VerificationError, ValueError):
        return False
