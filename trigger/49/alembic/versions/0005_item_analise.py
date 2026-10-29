"""Campos de análise no item PNCP."""

from alembic import op

revision = "0005_item_analise"
down_revision = "0004_ano_2026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE contratacao_item
            ADD COLUMN IF NOT EXISTS descricao_detalhada text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS quantidade numeric(18, 4),
            ADD COLUMN IF NOT EXISTS unidade_medida varchar(40) NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS valor_unitario numeric(18, 4),
            ADD COLUMN IF NOT EXISTS material_ou_servico varchar(20) NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS situacao_item varchar(120) NOT NULL DEFAULT '';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE contratacao_item
            DROP COLUMN IF EXISTS descricao_detalhada,
            DROP COLUMN IF EXISTS quantidade,
            DROP COLUMN IF EXISTS unidade_medida,
            DROP COLUMN IF EXISTS valor_unitario,
            DROP COLUMN IF EXISTS material_ou_servico,
            DROP COLUMN IF EXISTS situacao_item;
        """
    )
