"""Período dos indicadores — resolução e filtro por exercício/publicação."""

from __future__ import annotations

from datetime import date

import pytest

from app.consultas.periodo import (
    PeriodoError,
    contratacao_no_periodo,
    parse_data_publicacao,
    resolver_periodo,
)


def test_resolver_omitido_e_tudo():
    assert resolver_periodo(None).modo == "tudo"
    assert resolver_periodo("tudo").rotulo == "Todo o histórico"


def test_resolver_ano_atual_e_anterior():
    hoje = date(2026, 10, 22)
    atual = resolver_periodo("ano_atual", hoje=hoje)
    assert atual.modo == "ano_atual"
    assert atual.ano == 2026
    assert atual.data_inicio == date(2026, 1, 1)
    assert atual.data_fim == date(2026, 12, 31)
    assert "2026" in atual.rotulo

    ant = resolver_periodo("ano_anterior", hoje=hoje)
    assert ant.ano == 2025
    assert ant.data_inicio == date(2025, 1, 1)


def test_resolver_quadrimestre_atual():
    # Outubro → Q3 (set–dez)
    p = resolver_periodo("quadrimestre_atual", hoje=date(2026, 10, 22))
    assert p.modo == "quadrimestre_atual"
    assert p.quadrimestre == 3
    assert p.data_inicio == date(2026, 9, 1)
    assert p.data_fim == date(2026, 12, 31)
    assert "Q3" in p.rotulo

    q1 = resolver_periodo("quadrimestre_atual", hoje=date(2026, 3, 1))
    assert q1.quadrimestre == 1
    assert q1.data_inicio == date(2026, 1, 1)
    assert q1.data_fim == date(2026, 4, 30)


def test_resolver_quadrimestre_explicito():
    p = resolver_periodo(
        "quadrimestre",
        ano=2024,
        quadrimestre=2,
        hoje=date(2026, 10, 22),
    )
    assert p.modo == "quadrimestre"
    assert p.ano == 2024
    assert p.quadrimestre == 2
    assert p.data_inicio == date(2024, 5, 1)
    assert p.data_fim == date(2024, 8, 31)
    assert "Q2" in p.rotulo

    # Sem ano/Q → defaults do dia de referência
    d = resolver_periodo("quadrimestre", hoje=date(2026, 10, 22))
    assert d.ano == 2026
    assert d.quadrimestre == 3


def test_resolver_quadrimestre_invalido():
    with pytest.raises(PeriodoError):
        resolver_periodo("quadrimestre", ano=2026, quadrimestre=4)


def test_resolver_intervalo():
    p = resolver_periodo(
        "intervalo",
        data_inicio="2026-05-01",
        data_fim="2026-08-31",
    )
    assert p.modo == "intervalo"
    assert p.data_inicio == date(2026, 5, 1)
    assert p.data_fim == date(2026, 8, 31)


def test_resolver_intervalo_invalido():
    with pytest.raises(PeriodoError):
        resolver_periodo("intervalo", data_inicio="2026-08-01", data_fim="2026-05-01")
    with pytest.raises(PeriodoError):
        resolver_periodo("intervalo")
    with pytest.raises(PeriodoError):
        resolver_periodo("foo")


def test_parse_data_publicacao_br_e_iso():
    assert parse_data_publicacao("22/10/2026 14:30") == date(2026, 10, 22)
    assert parse_data_publicacao("2026-10-22") == date(2026, 10, 22)
    assert parse_data_publicacao(None) is None
    assert parse_data_publicacao("lixo") is None


def test_contratacao_no_periodo_ano():
    p = resolver_periodo("ano_atual", hoje=date(2026, 6, 1))
    assert contratacao_no_periodo(
        ano=2026, data_publicacao_pncp=None, periodo=p
    )
    assert not contratacao_no_periodo(
        ano=2025, data_publicacao_pncp="01/01/2026", periodo=p
    )


def test_contratacao_no_periodo_quadrimestre_por_publicacao():
    p = resolver_periodo("quadrimestre_atual", hoje=date(2026, 10, 22))
    assert contratacao_no_periodo(
        ano=2026,
        data_publicacao_pncp="15/10/2026 10:00",
        periodo=p,
    )
    assert not contratacao_no_periodo(
        ano=2026,
        data_publicacao_pncp="15/05/2026 10:00",
        periodo=p,
    )
    # Sem data parseável e intervalo parcial → fora
    assert not contratacao_no_periodo(
        ano=2026, data_publicacao_pncp=None, periodo=p
    )
