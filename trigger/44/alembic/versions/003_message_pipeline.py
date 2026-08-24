"""message intake source + recovery index

Revision ID: 003_message_pipeline
Revises: 002_baileys_pairing
Create Date: 2026-08-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_message_pipeline"
down_revision: Union[str, None] = "002_baileys_pairing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="api",
        ),
    )
    op.create_index(
        "ix_messages_queued_recovery",
        "messages",
        ["status", "attempts", "queued_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_messages_queued_recovery", table_name="messages")
    op.drop_column("messages", "source")
