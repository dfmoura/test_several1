from __future__ import annotations

import re

_PESOS_1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_PESOS_2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def somente_digitos(valor: str | None) -> str:
    return re.sub(r"\D", "", valor or "")


def cnpj_valido(valor: str | None) -> bool:
    digitos = somente_digitos(valor)
    if len(digitos) != 14 or digitos == digitos[0] * 14:
        return False
    primeiro = _digito(digitos[:12], _PESOS_1)
    segundo = _digito(digitos[:12] + primeiro, _PESOS_2)
    return digitos[-2:] == primeiro + segundo


def _digito(base: str, pesos: tuple[int, ...]) -> str:
    soma = sum(int(n) * p for n, p in zip(base, pesos, strict=True))
    resto = soma % 11
    return "0" if resto < 2 else str(11 - resto)
