"""Fase 8 — health produção, prontidão, backup API, anti-Power-BI."""

from __future__ import annotations

import uuid
from pathlib import Path

from app.config import POWER_BI_ENABLED


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def test_power_bi_sempre_desligado():
    assert POWER_BI_ENABLED is False


def test_health_fase8_sem_power_bi(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["fase"] == "9"
    assert body["power_bi"] is False
    assert body["analytics"] == "nativo"
    assert "version" in body


def test_ops_info_e_prontidao(client):
    boot = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert boot.status_code == 200

    info = client.get("/api/ops/info")
    assert info.status_code == 200
    assert info.json()["power_bi"] is False
    assert info.json()["fase"] == "9"

    pr = client.get("/api/ops/prontidao")
    assert pr.status_code == 200
    body = pr.json()
    assert body["power_bi"] is False
    assert any(i["id"] == "power_bi" and i["ok"] is True for i in body["itens"])
    assert any(i["id"] == "usuario" and i["ok"] is True for i in body["itens"])
    assert len(body["manuais"]) >= 4


def test_ops_backup_admin(client):
    boot = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert boot.status_code == 200

    r = client.post("/api/ops/backup", json={"label": "teste", "manter": 5})
    assert r.status_code == 200, r.text
    pasta = Path(r.json()["pasta"])
    assert pasta.is_dir()
    assert (pasta / "BACKUP_META.txt").is_file()


def test_acesso_restrito_bloqueia_consulta_mantem_admin(client):
    boot = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert boot.status_code == 200

    pub = client.get("/api/ops/acesso-publico")
    assert pub.status_code == 200
    assert pub.json()["restrito"] is False

    cons = _uid("cons")
    cri = client.post(
        "/api/auth/usuarios",
        json={"username": cons, "password": "consulta1", "papel": "consulta"},
    )
    assert cri.status_code in (200, 201), cri.text

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c_cons:
        ok = c_cons.post(
            "/api/auth/login",
            json={"username": cons, "password": "consulta1"},
        )
        assert ok.status_code == 200

        put = client.put(
            "/api/ops/acesso",
            json={"restrito": True, "mensagem": "Janela operacional de teste."},
        )
        assert put.status_code == 200, put.text
        assert put.json()["restrito"] is True
        assert put.json().get("sessoes_nao_admin_encerradas", 0) >= 1

        pub2 = client.get("/api/ops/acesso-publico")
        assert pub2.json()["restrito"] is True

        # Sessão consulta encerrada (401) — login novo também bloqueado (403)
        me = c_cons.get("/api/auth/me")
        assert me.status_code in (401, 403)

        neg = c_cons.post(
            "/api/auth/login",
            json={
                "username": cons,
                "password": "consulta1",
                "encerrar_sessao_anterior": True,
            },
        )
        assert neg.status_code == 403
        detail = (neg.json().get("detail") or "").lower()
        assert "operacional" in detail or "administradores" in detail

    info = client.get("/api/ops/info")
    assert info.status_code == 200

    liberar = client.put("/api/ops/acesso", json={"restrito": False})
    assert liberar.status_code == 200
    assert liberar.json()["restrito"] is False

    with TestClient(app) as c_cons2:
        ok2 = c_cons2.post(
            "/api/auth/login",
            json={
                "username": cons,
                "password": "consulta1",
                "encerrar_sessao_anterior": True,
            },
        )
        assert ok2.status_code == 200
