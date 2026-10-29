"""Fixtures isoladas — nunca usam data/observatorio.db de desenvolvimento."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("OBSERVATORIO_DB_PATH", str(db_path))
    monkeypatch.setenv("AUTH_DISABLED", "0")
    monkeypatch.setenv("COLETA_SCHEDULER", "0")
    # Isola testes da cadeia HTTP pública (hook pós-coleta fica off).
    monkeypatch.setenv("CNPJ_PUBLICO_POS_COLETA_LIMIT", "0")
    monkeypatch.setenv("CNPJ_PUBLICO_POS_COLETA_MAX_SEC", "0")
    monkeypatch.setenv("CNPJ_PUBLICO_POS_COLETA_ATE_HORA", "06:00")
    monkeypatch.setenv("CNPJ_PUBLICO_POS_COLETA_DESCANSO_SEC", "0")
    monkeypatch.delenv("AUTH_BOOTSTRAP_USERNAME", raising=False)
    monkeypatch.delenv("AUTH_BOOTSTRAP_PASSWORD", raising=False)

    import app.config as cfg
    import app.coleta.agendamento as agendamento_mod
    from app.database import configure_engine

    # .env de dev pode ter AUTH_BOOTSTRAP_* — zera no módulo já importado.
    monkeypatch.setattr(cfg, "DB_PATH", db_path)
    monkeypatch.setattr(cfg, "AUTH_BOOTSTRAP_USERNAME", "")
    monkeypatch.setattr(cfg, "AUTH_BOOTSTRAP_PASSWORD", "")
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_LIMIT", 0)
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_MAX_SEC", 0.0)
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_ATE_HORA", "06:00")
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_DESCANSO_SEC", 0.0)
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_LOTE_INTERVALO_SEC", 0.0)
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_LOTE_BACKOFF_SEC", 0.0)
    # Scheduler off nos testes (mesmo se .env local tiver COLETA_SCHEDULER=1).
    monkeypatch.setattr(cfg, "COLETA_SCHEDULER", False)
    monkeypatch.setattr(agendamento_mod, "COLETA_SCHEDULER", False)
    # service importa os símbolos por nome no import-time
    import app.auth.service as auth_service

    monkeypatch.setattr(auth_service, "AUTH_BOOTSTRAP_USERNAME", "")
    monkeypatch.setattr(auth_service, "AUTH_BOOTSTRAP_PASSWORD", "")
    configure_engine(db_path)

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db(client):  # noqa: ARG001 — garante init via lifespan do TestClient
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
