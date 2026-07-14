"""Testes do coletor de resultados com mock httpx."""

from datetime import date
from unittest.mock import MagicMock, patch

from app.compras.coletor_resultados import coletar_resultados, resultado_da_api


PAYLOAD = {
    "idCompraItem": "abc-123",
    "idCompra": "999",
    "sequencialResultado": 1,
    "niFornecedor": "12345678000199",
    "nomeRazaoSocialFornecedor": "Empresa XYZ",
    "quantidadeHomologada": 10,
    "valorUnitarioHomologado": 50.0,
    "valorTotalHomologado": 500.0,
    "situacaoCompraItemResultadoNome": "Homologado",
    "ordemClassificacaoSrp": 1,
}


def test_resultado_da_api():
    item = resultado_da_api(PAYLOAD)
    assert item is not None
    assert item.id_compra_item == "abc-123"
    assert item.ni_fornecedor == "12345678000199"
    assert item.valor_total_homologado == "R$ 500,00"


@patch("app.compras.coletor_resultados.ComprasGovClient")
def test_coletar_resultados_pagina(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value.__enter__.return_value = mock_client
    mock_client.paginar.return_value = [PAYLOAD]

    itens = coletar_resultados(
        data_inicial=date(2025, 1, 1),
        data_final=date(2025, 1, 7),
        unidades=["926922"],
    )
    assert len(itens) == 1
    assert itens[0].nome_razao_social_fornecedor == "Empresa XYZ"
