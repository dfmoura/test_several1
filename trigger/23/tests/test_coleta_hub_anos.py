"""Compras.gov na coleta unificada: faixa multi-ano (Setup / agendamento)."""

from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

from app import coleta_hub


def test_anos_compras_efetivos_datas_explicitas():
    assert (
        coleta_hub._anos_compras_efetivos(
            ano=2024,
            anos_compras=[2024, 2025],
            data_inicial=date(2024, 3, 1),
            data_final=date(2024, 3, 31),
        )
        is None
    )


def test_anos_compras_efetivos_lista_setup():
    assert coleta_hub._anos_compras_efetivos(
        ano=2026,
        anos_compras=[2025, 2026, 2024],
        data_inicial=None,
        data_final=None,
    ) == [2024, 2025, 2026]


def test_anos_compras_efetivos_ano_unico_manual():
    assert coleta_hub._anos_compras_efetivos(
        ano=2026,
        anos_compras=None,
        data_inicial=None,
        data_final=None,
    ) == [2026]


def test_executar_coleta_compras_percorre_anos_setup():
    anos_chamados: list[int] = []

    def _fake_pipeline(**kwargs):
        anos_chamados.append(kwargs["ano"])
        out = MagicMock()
        out.contadores = {"contratacoes_novos": 1}
        return out

    coleta_hub.preparar_status(["compras"])
    with patch("app.coleta_hub.executar_pipeline", side_effect=_fake_pipeline):
        coleta_hub.executar_coleta_unificada(
            fontes=["compras"],
            ano=2026,
            anos_compras=[2025, 2026],
        )

    assert anos_chamados == [2025, 2026]
    assert coleta_hub.status["resultado"]["ok"] is True
    assert coleta_hub.status["resultado"]["fontes"]["compras"]["contratacoes_novos"] == 2
