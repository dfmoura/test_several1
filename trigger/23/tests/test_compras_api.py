"""Testes da API Compras.gov (rotas extraídas) — mocks de HTTP, sem rede."""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.compras import api as compras_api
from app.database import CompraContratacao, SessionLocal, init_db
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_status_coleta():
    compras_api._compras_coleta_status.update(
        running=False, fase="idle", log=[], resultado=None, contadores={}
    )
    yield
    compras_api._compras_coleta_status.update(
        running=False, fase="idle", log=[], resultado=None, contadores={}
    )


def test_compras_stats_e_modalidades(client):
    r = client.get("/api/compras/stats")
    assert r.status_code == 200
    body = r.json()
    assert "total" in body
    assert "por_ano" in body

    mods = client.get("/api/compras/modalidades")
    assert mods.status_code == 200
    assert isinstance(mods.json(), list)
    assert mods.json()


def test_compras_coletar_com_mocks(client, monkeypatch):
    """Dispara coleta sem chamar a API federal."""

    def fake_coletar(**kwargs):
        return []

    def fake_itens(**kwargs):
        return []

    def fake_resultados(**kwargs):
        return []

    monkeypatch.setattr(compras_api, "coletar_compras", fake_coletar)
    monkeypatch.setattr(compras_api, "coletar_itens", fake_itens)
    monkeypatch.setattr(compras_api, "coletar_resultados", fake_resultados)

    r = client.post("/api/compras/coletar", json={"ano": 2024})
    assert r.status_code == 200
    assert r.json()["status"] == "iniciada"
    assert r.json()["modo"] == "api_pncp"

    # background do TestClient roda inline
    st = client.get("/api/compras/coletar/status").json()
    assert st["running"] is False
    assert st["resultado"] is not None
    assert st["resultado"]["ok"] is True
    assert st["resultado"]["total"] == 0


def test_compras_coletar_completo_mock_pipeline(client, monkeypatch):
    def fake_pipeline(**kwargs):
        return SimpleNamespace(contadores={"fase_07": 0, "itens": 0})

    monkeypatch.setattr(compras_api, "executar_pipeline", fake_pipeline)
    r = client.post(
        "/api/compras/coletar-completo",
        json={"ano": 2024, "fases": ["07"]},
    )
    assert r.status_code == 200
    assert r.json()["modo"] == "orquestrador"
    st = client.get("/api/compras/coletar/status").json()
    assert st["resultado"]["ok"] is True


def test_compras_coletar_conflito_409(client):
    compras_api._compras_coleta_status["running"] = True
    r = client.post("/api/compras/coletar", json={"ano": 2024})
    assert r.status_code == 409


def test_listar_contratacoes_apos_inserir(client):
    init_db()
    db = SessionLocal()
    try:
        row = CompraContratacao(
            unidade_compradora="926922",
            unidade_nome="Teste",
            ano=2024,
            chave_compra="TESTE-CHAVE-API-1",
            id_compra="TESTE-CHAVE-API-1",
            objeto="Objeto teste proteção",
            situacao_lista="Divulgada no PNCP",
        )
        db.add(row)
        db.commit()
        cid = row.id
    finally:
        db.close()

    r = client.get("/api/compras/contratacoes", params={"ano": 2024, "texto": "proteção"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any(i["id"] == cid for i in data["items"])

    det = client.get(f"/api/compras/contratacoes/{cid}")
    assert det.status_code == 200
    assert det.json()["chave_compra"] == "TESTE-CHAVE-API-1"


def test_resolver_periodo_coleta():
    req = compras_api.ComprasColetaRequest(
        data_inicial=date(2024, 3, 1), data_final=date(2024, 3, 31)
    )
    assert compras_api._resolver_periodo_coleta(req) == (date(2024, 3, 1), date(2024, 3, 31))
    req2 = compras_api.ComprasColetaRequest(ano=2023)
    assert compras_api._resolver_periodo_coleta(req2) == (date(2023, 1, 1), date(2023, 12, 31))
