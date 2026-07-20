"""Add optional contact profile fields on users.

Revision ID: 002_contact_profile
Revises: 001_initial
Create Date: 2026-07-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_contact_profile"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("relation", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("notes", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "notes")
    op.drop_column("users", "relation")
