"""baileys pairing columns

Revision ID: 002_baileys_pairing
Revises: 001_initial
Create Date: 2026-08-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_baileys_pairing"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "senders",
        sa.Column("evolution_instance", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "senders",
        sa.Column("last_connected_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column(
        "senders",
        "phone_e164",
        existing_type=sa.String(length=20),
        nullable=True,
    )
    op.create_index(
        "ix_senders_evolution_instance",
        "senders",
        ["evolution_instance"],
    )


def downgrade() -> None:
    op.drop_index("ix_senders_evolution_instance", table_name="senders")
    op.execute(
        "UPDATE senders SET phone_e164 = '0000000000' WHERE phone_e164 IS NULL"
    )
    op.alter_column(
        "senders",
        "phone_e164",
        existing_type=sa.String(length=20),
        nullable=False,
    )
    op.drop_column("senders", "last_connected_at")
    op.drop_column("senders", "evolution_instance")
