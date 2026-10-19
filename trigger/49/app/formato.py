from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal


def data_exibicao(valor: date | None) -> str:
    if valor is None:
        return ""
    return valor.strftime("%d/%m/%Y")


def dinheiro_exibicao(valor: Decimal | None) -> str:
    if valor is None:
        return ""
    quantizado = Decimal(valor).quantize(Decimal("0.01"))
    sinal = "-" if quantizado < 0 else ""
    absoluto = abs(quantizado)
    inteiro, centavos = f"{absoluto:.2f}".split(".")
    grupos: list[str] = []
    while inteiro:
        grupos.append(inteiro[-3:])
        inteiro = inteiro[:-3]
    return f"{sinal}R$ {'.'.join(reversed(grupos))},{centavos}"


def instante_exibicao(valor: datetime | None) -> str:
    if valor is None:
        return ""
    from app.tempo import FUSO

    if valor.tzinfo is None:
        return valor.strftime("%d/%m/%Y %H:%M")
    return valor.astimezone(FUSO).strftime("%d/%m/%Y %H:%M")
