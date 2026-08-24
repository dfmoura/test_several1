"""multi-sender label for operator naming

Revision ID: 004
Revises: 003
Create Date: 2026-08-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_multi_sender_label"
down_revision: Union[str, None] = "003_message_pipeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "senders",
        sa.Column("label", sa.String(length=80), nullable=True),
    )
    op.create_index("ix_senders_account_label", "senders", ["account_id", "label"])


def downgrade() -> None:
    op.drop_index("ix_senders_account_label", table_name="senders")
    op.drop_column("senders", "label")
