"""Backlog operacional — API, seed de melhorias e regras início/fim."""

from __future__ import annotations

import uuid
from datetime import datetime

from app.backlog.seed import _SEED_ITENS


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _admin(client):
    boot = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert boot.status_code == 200, boot.text


def test_seed_melhorias_periodo_sem_sono(client):
    _admin(client)
    r = client.get("/api/backlog?situacao=concluidos")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= len(_SEED_ITENS)
    codigos = {row["codigo"] for row in body["data"]}
    for item in _SEED_ITENS:
        assert item["codigo"] in codigos

    # Nenhum lançamento invade o sono ~23:10 → 05:30
    sono_ini = datetime(2026, 10, 21, 23, 10)
    sono_fim = datetime(2026, 10, 22, 5, 30)
    for row in body["data"]:
        if not str(row["codigo"]).startswith("BLG-0000"):
            continue
        ini = datetime.strptime(row["inicio_em"][:16], "%Y-%m-%d %H:%M")
        fim = datetime.strptime(row["fim_em"][:16], "%Y-%m-%d %H:%M")
        assert fim >= ini
        # intervalo [ini, fim] não intersecta (sono_ini, sono_fim)
        assert fim <= sono_ini or ini >= sono_fim, row["codigo"]


def test_backlog_criar_concluir_reabrir(client):
    _admin(client)
    created = client.post(
        "/api/backlog",
        json={
            "tarefa": "Smoke teste backlog API",
            "inicio_em": "2026-10-22 08:00",
        },
    )
    assert created.status_code == 200, created.text
    item = created.json()["data"]
    assert item["situacao"] == "ABERTO"
    assert item["codigo"].startswith("BLG-")
    assert item["fim_em"] is None

    done = client.post(
        f"/api/backlog/{item['id']}/concluir",
        json={
            "fim_em": "2026-10-22 08:45",
            "observacao_conclusao": "API ok; observação preenchida.",
        },
    )
    assert done.status_code == 200, done.text
    assert done.json()["data"]["situacao"] == "CONCLUIDO"
    assert done.json()["data"]["observacao_conclusao"] == "API ok; observação preenchida."

    reopen = client.post(f"/api/backlog/{item['id']}/reabrir", json={})
    assert reopen.status_code == 200
    assert reopen.json()["data"]["situacao"] == "ABERTO"
    assert reopen.json()["data"]["observacao_conclusao"] is None


def test_backlog_fim_antes_inicio_rejeitado(client):
    _admin(client)
    r = client.post(
        "/api/backlog",
        json={
            "tarefa": "Inválido",
            "inicio_em": "2026-10-22 09:00",
            "fim_em": "2026-10-22 08:00",
            "observacao_conclusao": "não deve gravar",
        },
    )
    assert r.status_code == 400


def test_backlog_consulta_sem_admin_ok_escrita_negada(client):
    boot = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert boot.status_code == 200

    username = _uid("cli")
    cri = client.post(
        "/api/auth/usuarios",
        json={"username": username, "password": "senha123", "papel": "consulta"},
    )
    assert cri.status_code in (200, 201), cri.text

    client.post("/api/auth/logout", json={})
    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": "senha123"},
    )
    assert login.status_code == 200, login.text

    # Consulta: backlog é tela admin (menu + API).
    lista = client.get("/api/backlog")
    assert lista.status_code == 403

    create = client.post(
        "/api/backlog",
        json={"tarefa": "sem permissão", "inicio_em": "2026-10-22 08:00"},
    )
    assert create.status_code == 403
