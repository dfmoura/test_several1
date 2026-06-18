"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "licitacoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("empresa_codigo", sa.String(length=4), nullable=True),
        sa.Column("empresa_nome", sa.String(length=300), nullable=True),
        sa.Column("ano", sa.Integer(), nullable=True),
        sa.Column("processo", sa.String(length=80), nullable=True),
        sa.Column("processo_numero", sa.String(length=80), nullable=True),
        sa.Column("modalidade", sa.String(length=120), nullable=True),
        sa.Column("descricao_edital", sa.Text(), nullable=True),
        sa.Column("objeto", sa.Text(), nullable=True),
        sa.Column("data_abertura", sa.DateTime(), nullable=True),
        sa.Column("data_habilitacao", sa.DateTime(), nullable=True),
        sa.Column("data_julgamento", sa.DateTime(), nullable=True),
        sa.Column("data_homologacao", sa.DateTime(), nullable=True),
        sa.Column("situacao", sa.String(length=120), nullable=True),
        sa.Column("chave", sa.String(length=50), nullable=True),
        sa.Column("descricao_habilitacao", sa.Text(), nullable=True),
        sa.Column("solicitante", sa.String(length=300), nullable=True),
        sa.Column("valor_licitacao", sa.String(length=120), nullable=True),
        sa.Column("valor_licitacao_numerico", sa.Numeric(18, 2), nullable=True),
        sa.Column("local_abertura", sa.String(length=300), nullable=True),
        sa.Column("data_visita_tecnica", sa.DateTime(), nullable=True),
        sa.Column("responsavel_visita_tecnica", sa.String(length=300), nullable=True),
        sa.Column("local_saida_visita_tecnica", sa.String(length=300), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("link_pncp", sa.Text(), nullable=True),
        sa.Column("link_compras_gov", sa.Text(), nullable=True),
        sa.Column("detalhe_url", sa.Text(), nullable=True),
        sa.Column("detalhe_coletado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("fonte", sa.String(length=30), nullable=True, server_default="scraper"),
        sa.Column("capturado_em", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_licitacoes_ano", "licitacoes", ["ano"])
    op.create_index("ix_licitacoes_processo", "licitacoes", ["processo"])
    op.create_index("ix_licitacoes_situacao", "licitacoes", ["situacao"])
    op.create_index("ix_licitacao_empresa_ano", "licitacoes", ["empresa_codigo", "ano"])
    op.create_index(
        "uq_licitacao_empresa_processo_ano",
        "licitacoes",
        ["empresa_codigo", "processo", "ano"],
        unique=True,
    )

    op.create_table(
        "licitacao_arquivos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("licitacao_id", sa.Integer(), nullable=False),
        sa.Column("nome_arquivo", sa.String(length=500), nullable=True),
        sa.Column("url_download", sa.Text(), nullable=True),
        sa.Column("ordem", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["licitacao_id"], ["licitacoes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_licitacao_arquivos_licitacao_id", "licitacao_arquivos", ["licitacao_id"])

    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("iniciado_em", sa.DateTime(), nullable=True),
        sa.Column("finalizado_em", sa.DateTime(), nullable=True),
        sa.Column("anos", sa.String(length=200), nullable=True),
        sa.Column("empresas", sa.String(length=200), nullable=True),
        sa.Column("coletar_detalhes", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("total_coletados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("novos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("atualizados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("detalhes_coletados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mensagem", sa.Text(), nullable=True),
        sa.Column("log", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sync_jobs_status", "sync_jobs", ["status"])
    op.create_index("ix_sync_jobs_criado_em", "sync_jobs", ["criado_em"])


def downgrade() -> None:
    op.drop_table("sync_jobs")
    op.drop_table("licitacao_arquivos")
    op.drop_index("uq_licitacao_empresa_processo_ano", table_name="licitacoes")
    op.drop_index("ix_licitacao_empresa_ano", table_name="licitacoes")
    op.drop_index("ix_licitacoes_situacao", table_name="licitacoes")
    op.drop_index("ix_licitacoes_processo", table_name="licitacoes")
    op.drop_index("ix_licitacoes_ano", table_name="licitacoes")
    op.drop_table("licitacoes")
