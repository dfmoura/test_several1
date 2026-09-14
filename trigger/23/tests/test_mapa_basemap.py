"""Config do basemap CARTO (API key via env)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_basemap_config_sem_key(monkeypatch):
    monkeypatch.setattr("app.mapa.CARTO_BASEMAP_API_KEY", "")
    r = client.get("/api/mapa/basemap")
    assert r.status_code == 200
    data = r.json()
    assert data["provider"] == "carto"
    assert data["style"] == "light_nolabels"
    assert data["carto_api_key"] == ""
    assert data["configured"] is False


def test_basemap_config_com_key(monkeypatch):
    monkeypatch.setattr("app.mapa.CARTO_BASEMAP_API_KEY", "cb1_test_key_exemplo")
    r = client.get("/api/mapa/basemap")
    assert r.status_code == 200
    data = r.json()
    assert data["configured"] is True
    assert data["carto_api_key"] == "cb1_test_key_exemplo"


def test_basemap_publico_sem_auth(monkeypatch):
    """Endpoint público: tiles precisam da key no browser antes/durante a sessão."""
    monkeypatch.setenv("AUTH_DISABLED", "0")
    monkeypatch.setattr("app.mapa.CARTO_BASEMAP_API_KEY", "cb1_public_ok")
    # Força reavaliação do flag no middleware
    monkeypatch.setattr("app.auth.middleware.auth_disabled", lambda: False)
    r = client.get("/api/mapa/basemap")
    assert r.status_code == 200
    assert r.json()["carto_api_key"] == "cb1_public_ok"
