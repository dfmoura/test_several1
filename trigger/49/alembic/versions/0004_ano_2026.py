"""Carga inicial passa a começar em 2026."""

from alembic import op

revision = "0004_ano_2026"
down_revision = "0003_acompanhamento"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE configuracao_agenda
            ALTER COLUMN ano_inicial_carga SET DEFAULT 2026;
        UPDATE configuracao_agenda SET ano_inicial_carga = 2026 WHERE id = 1;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE configuracao_agenda
            ALTER COLUMN ano_inicial_carga SET DEFAULT 2023;
        UPDATE configuracao_agenda SET ano_inicial_carga = 2023 WHERE id = 1;
        """
    )
