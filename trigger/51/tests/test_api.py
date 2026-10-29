import os
from pathlib import Path

os.environ.setdefault("API_KEY", "assistencia-local-dev")
os.environ.setdefault("LLM_MODE", "mock")
os.environ["LLM_CONFIG_PATH"] = "/tmp/assistencia-llm-test.json"
Path(os.environ["LLM_CONFIG_PATH"]).unlink(missing_ok=True)

from fastapi.testclient import TestClient

from app.main import app
from app.runtime import runtime

client = TestClient(app)
AUTH = {"X-API-Key": "assistencia-local-dev"}


def setup_function():
    Path(os.environ["LLM_CONFIG_PATH"]).unlink(missing_ok=True)
    runtime.reload()


def test_health_sem_auth():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_sem_chave_recusa():
    r = client.post("/v1/sessions", json={})
    assert r.status_code == 401


def test_fluxo_mock_ate_descricao():
    r = client.post("/v1/sessions", json={"contexto": "formular_demanda"}, headers=AUTH)
    assert r.status_code == 200
    sid = r.json()["session_id"]
    assert r.json()["reply"]

    r = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"message": "O fechamento do mês ainda sai em planilha."},
        headers=AUTH,
    )
    assert r.status_code == 200
    assert r.json()["reply"]

    r = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"message": "Precisa sair do ERP sem retrabalho."},
        headers=AUTH,
    )
    assert r.status_code == 200

    r = client.post(f"/v1/sessions/{sid}/compose", headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert "planilha" in body["descricao"].lower() or "fechamento" in body["descricao"].lower()
    assert "senha" not in body["descricao"].lower()

    # compose não encerra — dá para continuar e reaplicar
    r = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"message": "Prazo desejado: até o fechamento do mês."},
        headers=AUTH,
    )
    assert r.status_code == 200
    r = client.post(f"/v1/sessions/{sid}/finalize", headers=AUTH)
    assert r.status_code == 200
    assert "fechamento" in r.json()["descricao"].lower() or "planilha" in r.json()["descricao"].lower()


def test_admin_llm_salva_sem_devolver_token():
    r = client.get("/v1/admin/llm", headers=AUTH)
    assert r.status_code == 200
    assert r.json()["mode"] == "mock"
    assert r.json()["api_key_set"] is False

    r = client.put(
        "/v1/admin/llm",
        headers=AUTH,
        json={
            "mode": "openai",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-teste-secreto-1234",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "openai"
    assert body["api_key_set"] is True
    assert body["api_key_hint"].endswith("1234")
    assert "sk-teste" not in str(body)

    r = client.put(
        "/v1/admin/llm",
        headers=AUTH,
        json={
            "mode": "mock",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1",
        },
    )
    assert r.status_code == 200
    assert r.json()["mode"] == "mock"
    assert r.json()["api_key_set"] is True  # token preservado


def test_admin_llm_test_mock():
    client.put(
        "/v1/admin/llm",
        headers=AUTH,
        json={
            "mode": "mock",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1",
        },
    )
    r = client.post("/v1/admin/llm/test", headers=AUTH)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["mode"] == "mock"


def _forcar_mock():
    client.put(
        "/v1/admin/llm",
        headers=AUTH,
        json={
            "mode": "mock",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1",
        },
    )


def test_desdobrar_pedido_simples_uma_etapa():
    _forcar_mock()
    r = client.post(
        "/v1/desdobrar",
        headers=AUTH,
        json={
            "codigo": "DEM-000001",
            "titulo": "Relatório de vendas",
            "descricao": "Precisamos filtrar vendas por período e exportar.",
            "objetivo": "Fechar o mês sem planilha.",
            "sistema_atual": "ERP atual",
            "mensagens": [],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "período" in body["descricao_funcional"].lower() or "periodo" in body["descricao_funcional"].lower() or "vendas" in body["descricao_funcional"].lower()
    assert "documentação" not in body["incluso"].lower()
    assert "treinamento" not in body["incluso"].lower()
    assert "R$" not in body["descricao_funcional"]
    assert len(body["etapas"]) == 1
    titulo = body["etapas"][0]["titulo"].lower()
    assert "alinhamento" not in titulo
    assert "homologação" not in titulo and "homologacao" not in titulo


def test_desdobrar_pedido_multipart_sem_inventar_processo():
    _forcar_mock()
    r = client.post(
        "/v1/desdobrar",
        headers=AUTH,
        json={
            "codigo": "DEM-000012",
            "titulo": "App de recarga NFC",
            "descricao": "Cobrança de recarga em postos via NFC, Pix e app mobile.",
            "objetivo": "Liberar o terminal após o pagamento.",
            "sistema_atual": "",
            "mensagens": [{"autor": "CLIENTE", "corpo": "Precisa de Android e iOS."}],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "nfc" in body["descricao_funcional"].lower() or "liberar" in body["descricao_funcional"].lower()
    assert 2 <= len(body["etapas"]) <= 4
    for etapa in body["etapas"]:
        t = etapa["titulo"].lower()
        assert "alinhamento" not in t
        assert "fundação" not in t and "fundacao" not in t
        assert "homologação" not in t and "homologacao" not in t
        assert "documentação" not in t and "documentacao" not in t
    assert "R$" not in body["descricao_funcional"]
    assert "suporte contínuo" not in body["incluso"].lower()
