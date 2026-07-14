"""Normalização de chaves de junção — CNPJ/CPF, id_compra, valores."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any


def normalizar_ni(val: Any) -> str | None:
    """Remove pontuação; pad CNPJ 14 / CPF 11."""
    if val is None:
        return None
    digits = re.sub(r"\D", "", str(val))
    if not digits:
        return None
    if len(digits) <= 11:
        return digits.zfill(11)
    return digits.zfill(14)


def normalizar_id_compra(val: Any) -> str | None:
    if val is None or val == "":
        return None
    return str(val).strip()


def normalizar_codigo_uasg(val: Any) -> str | None:
    if val is None or val == "":
        return None
    return str(val).strip()


def normalizar_cnpj_orgao(val: Any) -> str | None:
    return normalizar_ni(val)


def parse_decimal(val: Any) -> Decimal | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        return Decimal(str(val))
    texto = str(val).strip().replace("R$", "").strip()
    texto = texto.replace(".", "").replace(",", ".")
    try:
        return Decimal(texto)
    except InvalidOperation:
        return None


def fmt_valor_br(val: Any) -> str | None:
    d = parse_decimal(val)
    if d is None:
        if val is None or val == "":
            return None
        return str(val)
    return f"R$ {d:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_num_br(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        txt = f"{float(val):,.4f}".rstrip("0").rstrip(".")
        return txt.replace(",", "X").replace(".", ",").replace("X", ".")
    return str(val)


def tipo_item_catalogo(material_ou_servico: Any) -> str:
    texto = str(material_ou_servico or "").strip().lower()
    if texto in ("s", "servico", "serviço", "servi"):
        return "Servico"
    return "Material"


def snake_case(camel: str) -> str:
    out: list[str] = []
    for i, ch in enumerate(camel):
        if ch.isupper() and i > 0:
            out.append("_")
        out.append(ch.lower())
    return "".join(out)


def raw_to_snake(raw: dict[str, Any], campos: tuple[str, ...]) -> dict[str, Any]:
    dados = {snake_case(k): raw.get(k) for k in campos}
    for k, v in dados.items():
        if isinstance(v, bool):
            dados[k] = v
        elif v is not None and not isinstance(v, (str, int, float, bool)):
            dados[k] = str(v)
    return dados
