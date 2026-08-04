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
    assert "portes" in data
    assert isinstance(data["ufs"], list)
    assert isinstance(data["portes"], list)
    for p in data["portes"]:
        assert "id" in p and "nome" in p
        assert p["id"]
        assert p["nome"]
    # Sem duplicatas canônicas (ex.: MICRO EMPRESA + MICROEMPRESA)
    ids = [p["id"] for p in data["portes"]]
    assert len(ids) == len(set(ids))


def test_stats_distribuicao_localidade():
    r = client.get("/api/distribuicao-localidade/stats", params={"metrica": "quantidade"})
    assert r.status_code == 200
    data = r.json()
    assert "resumo" in data
    assert "por_uf" in data
    assert "por_municipio" in data
    assert "por_porte" in data
    resumo = data["resumo"]
    assert resumo["quantidade"] >= 0
    assert resumo["contratacoes"] >= 0
    # Itens (linhas 07.3) ≥ contratações distintas — nunca o inverso
    assert resumo["quantidade"] >= resumo["contratacoes"]
    assert "uberlandia" in resumo
    assert "fora" in resumo
    assert data["filtros"]["metrica"] == "quantidade"
    assert "porte" in data["filtros"]
    assert "itens" in data["interpretacao"]["quantidade"].lower()
    assert "licita" in data["interpretacao"]["quantidade"].lower()
    assert "porte" in data["interpretacao"]

    portes = data["por_porte"]
    assert isinstance(portes, list)
    soma_q = 0
    for p in portes:
        assert "id" in p and "nome" in p
        assert "quantidade" in p and "valor" in p
        assert "pct_quantidade" in p and "pct_valor" in p
        assert "ticket_medio_item" in p
        assert "uberlandia" in p and "fora" in p
        assert p["quantidade"] >= 0
        soma_q += p["quantidade"]
        # Escopo interno não excede o total do porte
        assert p["uberlandia"]["quantidade"] + p["fora"]["quantidade"] == p["quantidade"]
    assert soma_q == resumo["quantidade"]


def test_stats_por_porte_filtro_restringe():
    """Com filtro de porte, a composição deve refletir só aquele porte (ou vazio)."""
    r = client.get(
        "/api/distribuicao-localidade/stats",
        params={"porte": "MICROEMPRESA", "metrica": "quantidade"},
    )
    assert r.status_code == 200
    data = r.json()
    ids = {p["id"] for p in data["por_porte"]}
    # Só ME e, eventualmente, nada — nunca outros portes misturados
    assert ids <= {"MICROEMPRESA"} or ids == set()
    if data["resumo"]["quantidade"] > 0:
        assert ids == {"MICROEMPRESA"}
        assert abs(data["por_porte"][0]["pct_quantidade"] - 100.0) < 0.01

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


def test_stats_filtro_porte_vazio():
    r = client.get(
        "/api/distribuicao-localidade/stats",
        params={"porte": "_vazio_", "metrica": "quantidade"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["filtros"]["porte"] == "_vazio_"
    assert data["filtros"]["porte_nome"] == "Não informado"
    assert data["resumo"]["quantidade"] >= 0


def test_stats_filtro_porte_unifica_variantes():
    """MICROEMPRESA deve incluir MICRO EMPRESA e MICROEMPRESA da base real."""
    r = client.get(
        "/api/distribuicao-localidade/stats",
        params={"porte": "MICROEMPRESA", "metrica": "quantidade"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["filtros"]["porte"] == "MICROEMPRESA"
    assert data["filtros"]["porte_nome"] == "Microempresa"
    # Com dados reais, microempresa costuma ter volume; se base vazia, >= 0
    assert data["resumo"]["quantidade"] >= 0

    r2 = client.get(
        "/api/distribuicao-localidade/stats",
        params={"porte": "MICRO EMPRESA", "metrica": "quantidade"},
    )
    assert r2.status_code == 200
    assert r2.json()["resumo"]["quantidade"] == data["resumo"]["quantidade"]


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
