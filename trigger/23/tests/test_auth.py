"""Testes de autenticação, papéis, teto de contas e hash de senha."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth.passwords import hash_senha, verificar_senha
from app.auth.service import AuthError, criar_usuario, limites_atual
from app.database import SessionLocal, Usuario, init_db
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "0")
    init_db()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "0")
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _limpar_usuario(db, username: str) -> None:
    row = db.scalar(select(Usuario).where(Usuario.username == username))
    if row:
        db.delete(row)
        db.commit()


def test_hash_senha_nao_armazena_texto_plano():
    senha = "segredo123"
    h = hash_senha(senha)
    assert h != senha
    assert h.startswith("$2")  # bcrypt
    assert verificar_senha(senha, h) is True
    assert verificar_senha("outra", h) is False


def test_visitante_sem_login_bloqueado(client):
    r = client.get("/api/compras/stats")
    assert r.status_code == 401
    assert client.get("/api/health").status_code == 200


def test_bootstrap_status_e_bloqueio_se_ja_existem(client):
    st = client.get("/api/auth/bootstrap-status")
    assert st.status_code == 200
    data = st.json()
    assert "precisa_bootstrap" in data
    assert "limites" in data

    if not data["precisa_bootstrap"]:
        r = client.post(
            "/api/auth/bootstrap",
            json={"username": _uid("x"), "password": "admin123"},
        )
        assert r.status_code == 409


def test_bootstrap_cria_admin_quando_vazio(client, db):
    st = client.get("/api/auth/bootstrap-status").json()
    if not st["precisa_bootstrap"]:
        pytest.skip("Base já possui usuários — bootstrap não aplicável")

    user = _uid("admin")
    try:
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
    finally:
        _limpar_usuario(db, user)


def _login_como_novo_admin(client, db) -> str:
    """Cria admin temporário e autentica. Retorna username."""
    user = _uid("adm")
    try:
        criar_usuario(db, username=user, senha="admin123", papel="admin")
    except AuthError as exc:
        pytest.skip(exc.message)
    r = client.post("/api/auth/login", json={"username": user, "password": "admin123"})
    assert r.status_code == 200, r.text
    return user


def test_consulta_bloqueada_em_api_admin(client, db):
    admin_user = _login_como_novo_admin(client, db)
    cons = _uid("cons")
    criados = [admin_user]
    try:
        r = client.post(
            "/api/auth/usuarios",
            json={"username": cons, "password": "consulta1", "papel": "consulta"},
        )
        if r.status_code == 409:
            pytest.skip(r.json()["detail"])
        assert r.status_code == 201, r.text
        criados.append(cons)

        client.post("/api/auth/logout")
        assert (
            client.post(
                "/api/auth/login",
                json={"username": cons, "password": "consulta1"},
            ).status_code
            == 200
        )

        assert client.get("/api/compras/stats").status_code == 200
        assert client.get("/api/sistema/config").status_code == 403
        assert client.post("/api/coleta", json={"fontes": ["compras"]}).status_code == 403
        assert client.get("/api/compras/vencedores-cnpj").status_code == 403
    finally:
        for nome in criados:
            _limpar_usuario(db, nome)


def test_teto_segundo_admin_e_consulta(client, db):
    admin_user = _login_como_novo_admin(client, db)
    criados = [admin_user]
    try:
        # 2º admin deve falhar (MAX_ADMIN=1)
        r = client.post(
            "/api/auth/usuarios",
            json={"username": _uid("adm2"), "password": "admin123", "papel": "admin"},
        )
        assert r.status_code == 409
        assert "admin" in r.json()["detail"].lower()

        # Preenche consultas até o teto
        while True:
            lim = limites_atual(db)
            if lim["vagas_consulta"] <= 0:
                break
            nome = _uid("c")
            r = client.post(
                "/api/auth/usuarios",
                json={"username": nome, "password": "consulta1", "papel": "consulta"},
            )
            assert r.status_code == 201, r.text
            criados.append(nome)

        r = client.post(
            "/api/auth/usuarios",
            json={"username": _uid("extra"), "password": "consulta1", "papel": "consulta"},
        )
        assert r.status_code == 409
        detail = r.json()["detail"].lower()
        assert "consulta" in detail or "limite" in detail
    finally:
        for nome in criados:
            _limpar_usuario(db, nome)


def test_login_senha_errada(client, db):
    user = _uid("login")
    try:
        criar_usuario(db, username=user, senha="correta1", papel="consulta")
    except AuthError as exc:
        pytest.skip(exc.message)
    try:
        r = client.post("/api/auth/login", json={"username": user, "password": "errada1"})
        assert r.status_code == 401
    finally:
        _limpar_usuario(db, user)


def test_sessao_unica_bloqueia_segundo_login(client, db):
    """Dois clientes com a mesma conta: o segundo recebe 409 e a 1ª sessão permanece."""
    from app.auth.service import MSG_SESSAO_OCUPADA
    from app.config import AUTH_SESSION_COOKIE

    user = _uid("oper")
    try:
        criar_usuario(db, username=user, senha="senha123", papel="consulta")
    except AuthError as exc:
        pytest.skip(exc.message)

    try:
        c1 = client
        r1 = c1.post("/api/auth/login", json={"username": user, "password": "senha123"})
        assert r1.status_code == 200, r1.text
        token1 = r1.cookies.get(AUTH_SESSION_COOKIE)
        assert token1

        # Mesmo cookie → renovação permitida (reenvio / mesmo navegador)
        r_same = c1.post("/api/auth/login", json={"username": user, "password": "senha123"})
        assert r_same.status_code == 200, r_same.text

        # Outro cliente sem o cookie da sessão ativa → bloqueado
        with TestClient(app) as c2:
            r2 = c2.post("/api/auth/login", json={"username": user, "password": "senha123"})
            assert r2.status_code == 409
            assert "sessão" in r2.json()["detail"].lower()
            assert MSG_SESSAO_OCUPADA.split(".")[0] in r2.json()["detail"]

        # Quem já estava logado continua válido
        me = c1.get("/api/auth/me")
        assert me.status_code == 200
        assert me.json()["username"] == user

        # Após logout, o segundo cliente consegue entrar
        assert c1.post("/api/auth/logout").status_code == 200
        with TestClient(app) as c3:
            r3 = c3.post("/api/auth/login", json={"username": user, "password": "senha123"})
            assert r3.status_code == 200, r3.text
    finally:
        _limpar_usuario(db, user)


def test_admin_libera_sessao_orfao(client, db):
    user = _uid("orf")
    admin = None
    try:
        criar_usuario(db, username=user, senha="senha123", papel="consulta")
    except AuthError as exc:
        pytest.skip(exc.message)
    try:
        admin = _login_como_novo_admin(client, db)
        # sessão da conta consulta em "outro" client
        with TestClient(app) as c_other:
            assert (
                c_other.post(
                    "/api/auth/login",
                    json={"username": user, "password": "senha123"},
                ).status_code
                == 200
            )

        # admin libera
        from app.database import Usuario

        uid = db.scalar(select(Usuario).where(Usuario.username == user)).id
        lib = client.post(f"/api/auth/usuarios/{uid}/liberar-sessao")
        assert lib.status_code == 200, lib.text
        assert lib.json()["ok"] is True

        with TestClient(app) as c_new:
            r = c_new.post(
                "/api/auth/login",
                json={"username": user, "password": "senha123"},
            )
            assert r.status_code == 200, r.text
    finally:
        _limpar_usuario(db, user)
        if admin:
            _limpar_usuario(db, admin)

