"""Filtros temporais canônicos compartilhados pelas consultas analíticas."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Literal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

TipoPeriodo = Literal["ano", "quadrimestre", "intervalo"]


@dataclass(frozen=True)
class Periodo:
    inicio: date
    fim: date


def resolver_periodo(
    *,
    periodo: TipoPeriodo | None = None,
    ano: int | None = None,
    quadrimestre: int | None = None,
    data_inicial: date | None = None,
    data_final: date | None = None,
) -> Periodo | None:
    """Valida a seleção e devolve limites inclusivos.

    Sem ``periodo``, datas explícitas ainda são aceitas, mas ``ano`` fica a
    cargo do endpoint para preservar a semântica estrutural das APIs legadas.
    """
    if periodo == "ano":
        if ano is None:
            raise ValueError("Informe o ano")
        return Periodo(date(ano, 1, 1), date(ano, 12, 31))

    if periodo == "quadrimestre":
        if ano is None:
            raise ValueError("Informe o ano do quadrimestre")
        if quadrimestre not in (1, 2, 3):
            raise ValueError("Quadrimestre deve ser 1, 2 ou 3")
        mes_inicial = 1 + (quadrimestre - 1) * 4
        mes_final = mes_inicial + 3
        dia_final = 31 if mes_final in (8, 12) else 30
        return Periodo(date(ano, mes_inicial, 1), date(ano, mes_final, dia_final))

    if periodo == "intervalo" or data_inicial is not None or data_final is not None:
        if data_inicial is None or data_final is None:
            raise ValueError("Informe as datas inicial e final")
        if data_inicial > data_final:
            raise ValueError("A data inicial não pode ser posterior à data final")
        return Periodo(data_inicial, data_final)

    return None


def _data_br_iso(campo: Any) -> Any:
    return (
        func.substr(campo, 7, 4)
        .concat("-")
        .concat(func.substr(campo, 4, 2))
        .concat("-")
        .concat(func.substr(campo, 1, 2))
    )


def _data_texto_iso(campo: Any) -> Any:
    """Aceita os formatos textuais BR e ISO usados pelas duas integrações."""
    return case(
        (func.substr(campo, 5, 1) == "-", func.substr(campo, 1, 10)),
        (func.substr(campo, 3, 1) == "/", _data_br_iso(campo)),
        else_=None,
    )


def data_iso_pncp(campo: Any) -> Any:
    """Normaliza a data textual do PNCP para ``YYYY-MM-DD`` no SQL."""
    return _data_texto_iso(campo)


def data_iso_powerbi(campo: Any) -> Any:
    """Normaliza a data textual do Power BI para ``YYYY-MM-DD`` no SQL."""
    return _data_texto_iso(campo)


def condicao_periodo(data_iso: Any, periodo: Periodo | None) -> Any | None:
    if periodo is None:
        return None
    return data_iso.between(periodo.inicio.isoformat(), periodo.fim.isoformat())


def anos_disponiveis(db: Session, data_iso: Any) -> list[int]:
    """Lista anos válidos presentes em uma expressão de data canônica."""
    ano_expr = func.substr(data_iso, 1, 4)
    rows = db.scalars(
        select(ano_expr)
        .where(ano_expr.between("2000", "2100"))
        .distinct()
        .order_by(ano_expr.desc())
    ).all()
    return [int(valor) for valor in rows if valor]
