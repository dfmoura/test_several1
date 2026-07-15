"""Testes do cliente Compras.gov — retry 429 e espera."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.compras.client import ComprasGovClient, espera_retry_http


def _resp(status: int, text: str = "", headers: dict | None = None) -> httpx.Response:
    req = httpx.Request("GET", "https://dadosabertos.compras.gov.br/x")
    return httpx.Response(status, request=req, text=text, headers=headers or {})


def test_espera_retry_parseia_try_again_in():
    resp = _resp(
        429,
        '{ "statusCode": 429, "message": "Rate limit is exceeded. Try again in 2 seconds." }',
    )
    assert espera_retry_http(resp, tentativa=1) == pytest.approx(2.5)


def test_espera_retry_header_retry_after():
    resp = _resp(429, "x", headers={"Retry-After": "3"})
    assert espera_retry_http(resp, tentativa=1) == 3.0


def test_get_json_repete_em_429_e_succeede():
    ok = httpx.Response(
        200,
        request=httpx.Request("GET", "https://example.com"),
        json={"resultado": [], "totalPaginas": 1},
    )
    limited = _resp(
        429,
        '{ "statusCode": 429, "message": "Rate limit is exceeded. Try again in 1 seconds." }',
    )

    with ComprasGovClient(on_log=None) as client:
        mock_get = MagicMock(side_effect=[limited, ok])
        client._http.get = mock_get
        with patch("app.compras.client.time.sleep") as sleep:
            data = client.get_json("https://example.com/api", contexto="CATMAT 1")
        assert data["totalPaginas"] == 1
        assert mock_get.call_count == 2
        sleep.assert_called()


def test_get_json_esgota_retries_em_429():
    limited = _resp(
        429,
        '{ "statusCode": 429, "message": "Rate limit is exceeded. Try again in 1 seconds." }',
    )
    with ComprasGovClient(on_log=None) as client:
        client._http.get = MagicMock(return_value=limited)
        with patch("app.compras.client.time.sleep"), patch(
            "app.compras.client.COMPRAS_PNCP_MAX_RETRIES", 2
        ):
            with pytest.raises(RuntimeError, match="HTTP 429"):
                client.get_json("https://example.com/api", contexto="CATMAT 9")
