"""Auth, bootstrap, sessão e proteção de API — Fase 0."""

from __future__ import annotations

import uuid

from app.auth.passwords import hash_senha, verificar_senha


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def test_hash_senha_nao_armazena_texto_plano():
    senha = "segredo123"
    h = hash_senha(senha)
    assert h != senha
    assert h.startswith("$2")
    assert verificar_senha(senha, h) is True
    assert verificar_senha("outra", h) is False


def test_cookie_secure_auto_respeita_scheme(monkeypatch):
    import app.config as cfg

    monkeypatch.setattr(cfg, "AUTH_COOKIE_SECURE", "auto")
    assert cfg.cookie_secure_for_request("https") is True
    assert cfg.cookie_secure_for_request("http") is False
    monkeypatch.setattr(cfg, "AUTH_COOKIE_SECURE", "1")
    assert cfg.cookie_secure_for_request("http") is True
    monkeypatch.setattr(cfg, "AUTH_COOKIE_SECURE", "0")
    assert cfg.cookie_secure_for_request("https") is False


def test_rota_protegida_sem_login(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert client.get("/api/health").status_code == 200


def test_bootstrap_cria_admin_e_bloqueia_segundo(client):
    st = client.get("/api/auth/bootstrap-status")
    assert st.status_code == 200
    assert st.json()["precisa_bootstrap"] is True

    user = _uid("admin")
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": user, "password": "admin123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["papel"] == "admin"
    assert body["username"] == user

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == user

    r2 = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("admin2"), "password": "admin123"},
    )
    assert r2.status_code == 409


def test_login_logout_ciclo(client):
    user = _uid("admin")
    assert (
        client.post(
            "/api/auth/bootstrap",
            json={"username": user, "password": "admin123"},
        ).status_code
        == 200
    )
    client.post("/api/auth/logout")

    bad = client.post(
        "/api/auth/login",
        json={"username": user, "password": "errada999"},
    )
    assert bad.status_code == 401

    ok = client.post(
        "/api/auth/login",
        json={"username": user, "password": "admin123"},
    )
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200

    # Segunda sessão sem takeover → 409
    other = client.post(
        "/api/auth/login",
        json={"username": user, "password": "admin123"},
    )
    # Mesmo cookie renova; limpa cookie para simular outro cliente
    client.cookies.clear()
    other = client.post(
        "/api/auth/login",
        json={"username": user, "password": "admin123"},
    )
    assert other.status_code == 409

    takeover = client.post(
        "/api/auth/login",
        json={
            "username": user,
            "password": "admin123",
            "encerrar_sessao_anterior": True,
        },
    )
    assert takeover.status_code == 200


def test_admin_cria_consulta(client):
    admin = _uid("adm")
    assert (
        client.post(
            "/api/auth/bootstrap",
            json={"username": admin, "password": "admin123"},
        ).status_code
        == 200
    )
    consulta = _uid("cons")
    r = client.post(
        "/api/auth/usuarios",
        json={"username": consulta, "password": "consulta1", "papel": "consulta"},
    )
    assert r.status_code == 201
    assert r.json()["papel"] == "consulta"

    lista = client.get("/api/auth/usuarios")
    assert lista.status_code == 200
    nomes = {u["username"] for u in lista.json()}
    assert admin in nomes and consulta in nomes


def test_permissoes_paginas_admin_vs_consulta(client):
    """Admin vê menu completo; consulta só Análise (sem Alertas)."""
    admin = _uid("adm")
    assert (
        client.post(
            "/api/auth/bootstrap",
            json={"username": admin, "password": "admin123"},
        ).status_code
        == 200
    )
    me_adm = client.get("/api/auth/me").json()
    pag_adm = me_adm["permissoes"]["paginas"]
    assert me_adm["permissoes"]["admin"] is True
    assert pag_adm["inicio"] is True
    assert pag_adm["alertas"] is True
    assert pag_adm["coleta"] is True
    assert pag_adm["usuarios"] is True
    assert pag_adm["backlog"] is True

    consulta = _uid("cons")
    assert (
        client.post(
            "/api/auth/usuarios",
            json={"username": consulta, "password": "consulta1", "papel": "consulta"},
        ).status_code
        == 201
    )
    client.post("/api/auth/logout", json={})
    assert (
        client.post(
            "/api/auth/login",
            json={"username": consulta, "password": "consulta1"},
        ).status_code
        == 200
    )
    me_c = client.get("/api/auth/me").json()
    pag = me_c["permissoes"]["paginas"]
    assert me_c["permissoes"]["admin"] is False
    assert pag["inicio"] is True
    assert pag["compras"] is True
    assert pag["propostas"] is True
    assert pag["vencedores"] is True
    assert pag["alertas"] is False
    assert pag["coleta"] is False
    assert pag["enriquecimento"] is False
    assert pag["operacao"] is False
    assert pag["organizacao"] is False
    assert pag["territorio"] is False
    assert pag["configuracao"] is False
    assert pag["usuarios"] is False
    assert pag["backlog"] is False

    assert client.get("/api/alertas/regras").status_code == 403
    assert client.get("/api/coleta/plano").status_code == 403
    assert client.get("/api/ops/info").status_code == 403
    # Análise permanece acessível (não 403 por papel)
    ind = client.get("/api/consultas/indicadores")
    assert ind.status_code != 403


def test_admin_edita_desativa_e_libera_sessao_usuario(client):
    """PATCH papel/ativo/senha + liberar sessão — sem exclusão hard (protege último admin)."""
    admin = _uid("adm")
    assert (
        client.post(
            "/api/auth/bootstrap",
            json={"username": admin, "password": "admin123"},
        ).status_code
        == 200
    )
    me = client.get("/api/auth/me").json()
    admin_id = me["id"]

    consulta = _uid("cons")
    criado = client.post(
        "/api/auth/usuarios",
        json={"username": consulta, "password": "consulta1", "papel": "consulta"},
    )
    assert criado.status_code == 201
    uid = criado.json()["id"]

    # promoção a admin bloqueada pelo teto (máx. 1)
    teto = client.patch(
        f"/api/auth/usuarios/{uid}",
        json={"papel": "admin"},
    )
    assert teto.status_code == 409

    # redefinir senha mantém papel consulta
    patched = client.patch(
        f"/api/auth/usuarios/{uid}",
        json={"password": "consulta2"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["papel"] == "consulta"
    assert patched.json()["ativo"] is True

    # único admin ativo não pode ser desativado
    bloqueado = client.patch(
        f"/api/auth/usuarios/{admin_id}",
        json={"ativo": False},
    )
    assert bloqueado.status_code == 409

    soft = client.patch(
        f"/api/auth/usuarios/{uid}",
        json={"ativo": False},
    )
    assert soft.status_code == 200
    assert soft.json()["ativo"] is False

    reativado = client.patch(
        f"/api/auth/usuarios/{uid}",
        json={"ativo": True},
    )
    assert reativado.status_code == 200
    assert reativado.json()["ativo"] is True

    # sessão ativa do consulta em "outro cliente"; admin retoma com takeover
    client.cookies.clear()
    assert (
        client.post(
            "/api/auth/login",
            json={"username": consulta, "password": "consulta2"},
        ).status_code
        == 200
    )
    client.cookies.clear()
    assert (
        client.post(
            "/api/auth/login",
            json={
                "username": admin,
                "password": "admin123",
                "encerrar_sessao_anterior": True,
            },
        ).status_code
        == 200
    )
    liberar = client.post(f"/api/auth/usuarios/{uid}/liberar-sessao")
    assert liberar.status_code == 200
    assert liberar.json()["ok"] is True
    assert liberar.json()["sessoes_encerradas"] >= 1
