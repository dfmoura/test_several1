"""Testes da distribuição geográfica de vencedores."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_filtros_distribuicao_localidade():
    r = client.get("/api/distribuicao-localidade/filtros")
    assert r.status_code == 200
    data = r.json()
    assert "anos" in data
    assert "orgaos" in data
    assert "modalidades" in data
    assert "ufs" in data
    assert isinstance(data["ufs"], list)


def test_stats_distribuicao_localidade():
    r = client.get("/api/distribuicao-localidade/stats", params={"metrica": "quantidade"})
    assert r.status_code == 200
    data = r.json()
    assert "resumo" in data
    assert "por_uf" in data
    assert "por_municipio" in data
    resumo = data["resumo"]
    assert resumo["quantidade"] >= 0
    assert resumo["contratacoes"] >= 0
    # Itens (linhas 07.3) ≥ contratações distintas — nunca o inverso
    assert resumo["quantidade"] >= resumo["contratacoes"]
    assert "uberlandia" in resumo
    assert "fora" in resumo
    assert data["filtros"]["metrica"] == "quantidade"
    assert "itens" in data["interpretacao"]["quantidade"].lower()
    assert "licita" in data["interpretacao"]["quantidade"].lower()


def test_stats_filtro_uf_e_escopo():
    r = client.get(
        "/api/distribuicao-localidade/stats",
        params={"uf": "MG", "escopo": "fora", "metrica": "valor"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["filtros"]["uf"] == "MG"
    assert data["filtros"]["escopo"] == "fora"
    for mun in data["por_municipio"]:
        assert mun["uf"] == "MG"
        assert mun["de_uberlandia"] is False


def test_geo_assets_estaticos():
    for path in (
        "/static/geo/brasil-ufs.geojson",
        "/static/geo/municipio-centroids.json",
        "/static/geo/uf-centroids.json",
        "/static/localidade.js",
    ):
        r = client.get(path)
        assert r.status_code == 200, path
        assert len(r.content) > 100
