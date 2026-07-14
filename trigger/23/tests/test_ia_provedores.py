"""Testes: Setup de provedores de IA, máscara de key e rotação do IAClient."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth.service import criar_usuario
from app.database import SessionLocal, init_db
from app.ia_client import ChatResultado, IAClient, _ProvedorRuntime
from app.ia_crypto import (
    criptografar_api_key,
    descriptografar_api_key,
    mascarar_api_key,
    reset_fernet_cache,
)
from app.main import app


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTH_DISABLED", "1")
    monkeypatch.setenv("IA_TOKEN_SECRET", "teste-segredo-ia-observatorio-local")
    monkeypatch.delenv("IA_FALLBACK_API_KEY", raising=False)
    reset_fernet_cache()
    init_db()
    with TestClient(app) as c:
        yield c
    reset_fernet_cache()


@pytest.fixture()
def client_auth(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "0")
    monkeypatch.setenv("IA_TOKEN_SECRET", "teste-segredo-ia-observatorio-local")
    reset_fernet_cache()
    init_db()
    with TestClient(app) as c:
        yield c
    reset_fernet_cache()


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _payload(**over):
    base = {
        "nome": "OpenAI teste",
        "provedor": "openai",
        "modelo": "gpt-4o-mini",
        "api_key": "sk-test-chave-secreta-123456",
        "prioridade": 10,
        "ativo": True,
    }
    base.update(over)
    return base


def test_criptografia_roundtrip():
    plain = "sk-abcDEF1234567890"
    token = criptografar_api_key(plain)
    assert plain not in token
    assert descriptografar_api_key(token) == plain
    mask = mascarar_api_key(plain)
    assert "sk-a" in mask or mask.startswith("sk-a")
    assert "7890" in mask
    assert plain not in mask


def test_criar_lista_nao_expoe_key(client):
    r = client.post("/api/sistema/ia-provedores", json=_payload())
    assert r.status_code == 201
    body = r.json()
    assert body["nome"] == "OpenAI teste"
    assert "api_key" not in body
    assert "api_key_criptografada" not in body
    assert body["api_key_mascara"]
    assert "sk-test-chave-secreta-123456" not in str(body)
    assert "sk-te" in body["api_key_mascara"] or "3456" in body["api_key_mascara"]

    lista = client.get("/api/sistema/ia-provedores").json()
    assert lista["total"] >= 1
    assert "aviso_custo" in lista
    raw = str(lista)
    assert "sk-test-chave-secreta-123456" not in raw


def test_editar_trocar_key_e_manter(client):
    criado = client.post("/api/sistema/ia-provedores", json=_payload()).json()
    pid = criado["id"]
    mask1 = criado["api_key_mascara"]

    # Sem api_key → mantém
    r = client.patch(
        f"/api/sistema/ia-provedores/{pid}",
        json={"nome": "Renomeado", "prioridade": 5},
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Renomeado"
    assert r.json()["api_key_mascara"] == mask1

    # Com api_key → troca máscara
    r2 = client.patch(
        f"/api/sistema/ia-provedores/{pid}",
        json={"api_key": "sk-nova-chave-super-secreta-999"},
    )
    assert r2.status_code == 200
    assert r2.json()["api_key_mascara"] != mask1
    assert "999" in r2.json()["api_key_mascara"] or "sk-n" in r2.json()["api_key_mascara"]


def test_desativar_e_remover(client):
    pid = client.post("/api/sistema/ia-provedores", json=_payload(nome="Remover")).json()["id"]
    r = client.patch(f"/api/sistema/ia-provedores/{pid}", json={"ativo": False})
    assert r.status_code == 200
    assert r.json()["ativo"] is False
    assert client.delete(f"/api/sistema/ia-provedores/{pid}").status_code == 200
    assert client.get(f"/api/sistema/ia-provedores/{pid}").status_code == 404


def test_provedor_invalido(client):
    r = client.post("/api/sistema/ia-provedores", json=_payload(provedor="foo"))
    assert r.status_code == 400


def test_deepseek_e_outros_aceitos(client):
    for tipo, nome in (
        ("deepseek", "DeepSeek"),
        ("groq", "Groq"),
        ("mistral", "Mistral"),
        ("xai", "xAI"),
        ("openrouter", "OpenRouter"),
        ("together", "Together"),
        ("perplexity", "Perplexity"),
    ):
        r = client.post(
            "/api/sistema/ia-provedores",
            json=_payload(nome=nome, provedor=tipo, api_key=f"sk-{tipo}-chave-teste-12345678"),
        )
        assert r.status_code == 201, r.text
        assert r.json()["provedor"] == tipo


def test_sem_login_bloqueado(client_auth):
    assert client_auth.get("/api/sistema/ia-provedores").status_code == 401
    assert client_auth.post("/api/sistema/ia-provedores", json=_payload()).status_code == 401


def test_consulta_nao_acessa(client_auth):
    db = SessionLocal()
    admin = _uid("adm")
    cons = _uid("cons")
    try:
        from app.auth.service import AuthError

        try:
            criar_usuario(db, username=admin, senha="admin123", papel="admin")
            criar_usuario(db, username=cons, senha="cons1234", papel="consulta")
        except AuthError as exc:
            pytest.skip(str(exc))
    finally:
        db.close()

    assert (
        client_auth.post(
            "/api/auth/login",
            json={"username": cons, "password": "cons1234"},
        ).status_code
        == 200
    )
    assert client_auth.get("/api/sistema/ia-provedores").status_code == 403


def test_rotacao_primeiro_falha_segundo_atende():
    p1 = _ProvedorRuntime(
        id=1, nome="ruim", provedor="openai", base_url=None,
        modelo="m", api_key="k1", prioridade=1,
    )
    p2 = _ProvedorRuntime(
        id=2, nome="bom", provedor="openai", base_url=None,
        modelo="m", api_key="k2", prioridade=2,
    )

    def fake_chat(p, messages, *, timeout):
        if p.id == 1:
            req = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
            resp = httpx.Response(429, request=req, text="quota")
            raise httpx.HTTPStatusError("quota", request=req, response=resp)
        return "resposta-ok"

    client = IAClient(timeout=5, max_tentativas_por_provedor=1)
    with (
        patch("app.ia_client.carregar_cadeia", return_value=[p1, p2]),
        patch("app.ia_client._disparar_chat", side_effect=fake_chat),
    ):
        out = client.chat([{"role": "user", "content": "oi"}], purpose="teste")
    assert out.ok is True
    assert out.texto == "resposta-ok"
    assert out.provedor_id == 2
    assert out.provedor_nome == "bom"
    assert len(out.tentativas) == 2
    assert out.tentativas[0]["ok"] is False
    assert out.tentativas[1]["ok"] is True


def test_rotacao_todos_falham():
    p1 = _ProvedorRuntime(
        id=1, nome="a", provedor="openai", base_url=None,
        modelo="m", api_key="k1", prioridade=1,
    )
    p2 = _ProvedorRuntime(
        id=2, nome="b", provedor="openai", base_url=None,
        modelo="m", api_key="k2", prioridade=2,
    )

    def always_fail(p, messages, *, timeout):
        req = httpx.Request("POST", "https://example.com")
        resp = httpx.Response(503, request=req, text="down")
        raise httpx.HTTPStatusError("down", request=req, response=resp)

    client = IAClient(timeout=5, max_tentativas_por_provedor=1)
    with (
        patch("app.ia_client.carregar_cadeia", return_value=[p1, p2]),
        patch("app.ia_client._disparar_chat", side_effect=always_fail),
    ):
        out = client.chat([{"role": "user", "content": "oi"}], purpose="teste")
    assert out.ok is False
    assert out.erro
    assert len(out.tentativas) == 2
    assert isinstance(out, ChatResultado)


def test_sem_provedores_erro_claro():
    client = IAClient()
    with patch("app.ia_client.carregar_cadeia", return_value=[]):
        out = client.chat([{"role": "user", "content": "oi"}])
    assert out.ok is False
    assert "Nenhum provedor" in (out.erro or "")
