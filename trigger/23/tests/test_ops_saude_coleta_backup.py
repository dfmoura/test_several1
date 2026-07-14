"""Testes de proteção: health, coleta hub e backup (não alteram data/ de produção)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import coleta_hub
from app.backup_ops import criar_backup, podar_backups
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_health_ok_com_banco(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["fontes"] == ["compras", "powerbi"]
    assert body["checks"]["database"]["ok"] is True


def test_coleta_normalizar_fontes():
    assert coleta_hub.normalizar_fontes(["compras", "powerbi"]) == ["compras", "powerbi"]
    assert coleta_hub.normalizar_fontes(["powerbi", "compras", "compras"]) == [
        "powerbi",
        "compras",
    ]
    with pytest.raises(ValueError):
        coleta_hub.normalizar_fontes([])
    with pytest.raises(ValueError):
        coleta_hub.normalizar_fontes(["oracle"])


def test_coleta_status_endpoint(client):
    r = client.get("/api/coleta/status")
    assert r.status_code == 200
    body = r.json()
    assert "running" in body
    assert "fase" in body
    assert "stale" in body


def test_coleta_rejeita_fonte_invalida(client):
    r = client.post("/api/coleta", json={"fontes": ["foo"]})
    assert r.status_code == 400


def test_backup_ops_em_tmpdir(tmp_path, monkeypatch):
    """Garante backup online sem tocar em data/backups de produção."""
    from app import backup_ops, config

    fake_data = tmp_path / "data"
    fake_data.mkdir()
    # Usa o DB de teste já isolado pelo conftest.
    monkeypatch.setattr(backup_ops, "DATA_DIR", fake_data)
    monkeypatch.setattr(backup_ops, "DB_PATH", Path(config.DB_PATH))
    monkeypatch.setattr(backup_ops, "DEFAULT_BACKUP_ROOT", fake_data / "backups")

    pasta1 = criar_backup(label="teste", incluir_powerbi=False, incluir_fernet=False)
    assert pasta1.is_dir()
    assert (pasta1 / "licitacoes.db").is_file()
    assert (pasta1 / "BACKUP_META.txt").is_file()

    pasta2 = criar_backup(label="teste", incluir_powerbi=False, incluir_fernet=False)
    assert pasta2 != pasta1
    removidas = podar_backups(destino_raiz=fake_data / "backups", manter=1)
    assert len(list((fake_data / "backups").iterdir())) == 1
    assert len(removidas) >= 1
    assert pasta1 in removidas or pasta2 in removidas
    assert (fake_data / "backups").joinpath(pasta2.name).exists() or (
        fake_data / "backups"
    ).joinpath(pasta1.name).exists()


def test_observadores_crud_basico(client):
    r = client.post(
        "/api/observadores",
        json={"nome": "Obs Teste Profissional", "email": "obs@example.com"},
    )
    assert r.status_code == 201
    oid = r.json()["id"]
    lista = client.get("/api/observadores").json()
    assert any(o["id"] == oid for o in lista)
    patch = client.patch(f"/api/observadores/{oid}", json={"ativo": False})
    assert patch.status_code == 200
    assert patch.json()["ativo"] is False
