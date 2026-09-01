"""Validação de CPF/CNPJ do pagador (pessoa física ou jurídica)."""

from __future__ import annotations

from typing import Literal

TipoPessoa = Literal["FISICA", "JURIDICA"]


def normalize_digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def _all_same_digits(digits: str) -> bool:
    return len(digits) > 0 and digits == digits[0] * len(digits)


def _check_digit(base: str, weights: list[int]) -> str:
    total = sum(int(digit) * weight for digit, weight in zip(base, weights))
    remainder = total % 11
    return "0" if remainder < 2 else str(11 - remainder)


def is_valid_cpf(value: str) -> bool:
    digits = normalize_digits(value)
    if len(digits) != 11 or _all_same_digits(digits):
        return False
    d1 = _check_digit(digits[:9], list(range(10, 1, -1)))
    d2 = _check_digit(digits[:9] + d1, list(range(11, 1, -1)))
    return digits[-2:] == d1 + d2


def is_valid_cnpj(value: str) -> bool:
    digits = normalize_digits(value)
    if len(digits) != 14 or _all_same_digits(digits):
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d1 = _check_digit(digits[:12], weights1)
    d2 = _check_digit(digits[:12] + d1, weights2)
    return digits[-2:] == d1 + d2


def classify_tipo_pessoa(value: str) -> TipoPessoa | None:
    digits = normalize_digits(value)
    if len(digits) == 11:
        return "FISICA"
    if len(digits) == 14:
        return "JURIDICA"
    return None


class DocumentError(Exception):
    pass


def validate_cpf_cnpj(value: str) -> tuple[str, TipoPessoa]:
    """Retorna (dígitos, tipoPessoa) ou levanta DocumentError."""
    digits = normalize_digits(value)
    tipo = classify_tipo_pessoa(digits)
    if tipo == "FISICA":
        if not is_valid_cpf(digits):
            raise DocumentError("CPF inválido. Confira os 11 dígitos.")
        return digits, tipo
    if tipo == "JURIDICA":
        if not is_valid_cnpj(digits):
            raise DocumentError("CNPJ inválido. Confira os 14 dígitos.")
        return digits, tipo
    raise DocumentError("Informe CPF (11 dígitos) ou CNPJ (14 dígitos).")
