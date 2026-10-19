from fastapi.testclient import TestClient

from app.main import app


def test_health_inclui_banco():
    with TestClient(app) as client:
        resposta = client.get("/api/health")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["status"] == "ok"
    assert corpo["banco"] == "ok"


def test_health_banco_indisponivel(monkeypatch):
    def falha():
        raise RuntimeError("banco fora")

    monkeypatch.setattr("app.health.SessionLocal", falha)
    with TestClient(app) as client:
        resposta = client.get("/api/health")
    assert resposta.status_code == 503
    corpo = resposta.json()
    assert corpo["status"] == "degraded"
    assert corpo["banco"] == "indisponivel"
    assert "banco fora" not in resposta.text


def test_raiz_nao_expoe_dado():
    with TestClient(app) as client:
        resposta = client.get("/")
    assert resposta.status_code == 200
    assert "text/html" in resposta.headers["content-type"]
    assert "Observatório Social Brasil" in resposta.text
    assert "Sem sessão" in resposta.text
