from __future__ import annotations

import os
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.db import SessionLocal, definir_contexto, restaurar_contexto


def _exigir_banco_efemero(url: str) -> None:
    partes = urlparse(url)
    if partes.hostname != "db_test" or partes.path.strip("/") != "osb_test":
        raise RuntimeError("pytest só roda no banco efêmero db_test/osb_test")


@pytest.fixture(scope="session", autouse=True)
def esquema():
    url_app = os.environ.get("DATABASE_URL", "")
    url_mig = os.environ.get("MIGRATION_DATABASE_URL", "")
    _exigir_banco_efemero(url_app)
    _exigir_banco_efemero(url_mig)
    command.upgrade(Config("alembic.ini"), "head")
    yield
    from app.db import engine

    engine.dispose()


@pytest.fixture(autouse=True)
def limpar():
    tokens = definir_contexto(None, master=True)
    db = SessionLocal()
    try:
        for tabela in (
            "coleta_etapa",
            "coleta_cursor",
            "coleta_job",
            "resultado_item",
            "contratacao_item",
            "anotacao_interna",
            "acompanhamento",
            "observador",
            "contratacao",
            "contrato_pncp",
            "ata_pncp",
            "filial_uasg",
            "catalogo_item",
            "cnpj_cache",
            "cep_cache",
            "sessao",
            "auditoria_acesso",
            "usuario",
            "uasg",
            "orgao_publico",
        ):
            db.execute(text(f"DELETE FROM {tabela}"))
        db.execute(text("DELETE FROM filial WHERE cnpj <> '23497346000142'"))
        db.execute(
            text(
                "UPDATE filial SET situacao = 'ativa', ultima_sync_uasg = NULL, "
                "escopo_alterado_em = NULL WHERE cnpj = '23497346000142'"
            )
        )
        db.execute(
            text(
                "UPDATE configuracao_agenda SET hora = 2, minuto = 10, janela_dias = 7, "
                "teto_abertas = 40, orcamento_chamadas = 300, ano_inicial_carga = 2023, "
                "backup_hora = 5, backup_minuto = 10, ultimo_filial_id = NULL WHERE id = 1"
            )
        )
        db.commit()
    finally:
        db.close()
        restaurar_contexto(tokens)
    yield
