"""Add lead qualification fields on users.

Revision ID: 003_lead_fields
Revises: 002_contact_profile
Create Date: 2026-07-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_lead_fields"
down_revision: Union[str, None] = "002_contact_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("lead_status", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("lead_segment", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("lead_system", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("lead_need", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("lead_next_step", sa.String(200), nullable=True))
    op.add_column(
        "users",
        sa.Column("lead_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "lead_updated_at")
    op.drop_column("users", "lead_next_step")
    op.drop_column("users", "lead_need")
    op.drop_column("users", "lead_system")
    op.drop_column("users", "lead_segment")
    op.drop_column("users", "lead_status")
