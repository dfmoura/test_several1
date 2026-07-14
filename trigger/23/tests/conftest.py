"""Configuração pytest — isola SQLite de produção e desliga auth nas suítes legadas.

CRÍTICO: LICITACOES_DB_PATH é definido aqui (antes de qualquer import de app.*)
para que testes nunca gravem em data/licitacoes.db.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

# Banco temporário por sessão pytest — nunca o data/ de produção.
_TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="obs_pytest_"))
_TEST_DB = _TEST_DATA_DIR / "licitacoes_test.db"
os.environ["LICITACOES_DB_PATH"] = str(_TEST_DB)
os.environ.setdefault("AUTH_DISABLED", "1")
os.environ.setdefault("IA_TOKEN_SECRET", "teste-segredo-ia-observatorio-local")

import pytest


@pytest.fixture(scope="session", autouse=True)
def _garantir_schema_teste():
    """Cria o schema no SQLite isolado uma vez por sessão."""
    from app.database import init_db

    init_db()
    yield
