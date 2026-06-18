"""Utilitários de parsing de datas e texto."""

from __future__ import annotations

from datetime import datetime

from dateutil import parser as date_parser


def parse_data_br(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    text = str(value).strip()
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text.split(".")[0], fmt.split(".")[0])
        except ValueError:
            continue
    try:
        return date_parser.parse(text, dayfirst=True)
    except (ValueError, TypeError):
        return None


def limpar_texto(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(str(value).split())
