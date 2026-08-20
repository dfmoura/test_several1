"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-08-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_accounts_email", "accounts", ["email"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("account_id", sa.String(length=40), nullable=False),
        sa.Column("plan_code", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=80), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )

    op.create_table(
        "senders",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("account_id", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone_e164", sa.String(length=20), nullable=False),
        sa.Column("channel", sa.String(length=40), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("phone_number_id", sa.String(length=80), nullable=True),
        sa.Column("waba_id", sa.String(length=80), nullable=True),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("api_key_hash", sa.String(length=255), nullable=False),
        sa.Column("api_key_prefix", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("rate_limit_per_minute", sa.Integer(), nullable=False),
        sa.Column("business_confirmed", sa.Boolean(), nullable=False),
        sa.Column("last_healthy_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "account_id", "phone_e164", name="uq_senders_account_phone"
        ),
    )
    op.create_index("ix_senders_api_key_prefix", "senders", ["api_key_prefix"])
    op.create_index("ix_senders_account_id", "senders", ["account_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("sender_id", sa.String(length=40), nullable=False),
        sa.Column("account_id", sa.String(length=40), nullable=False),
        sa.Column("external_id", sa.String(length=200), nullable=False),
        sa.Column("to_phone", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("provider_message_id", sa.String(length=120), nullable=True),
        sa.Column("queued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dead_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["senders.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "sender_id", "external_id", name="uq_messages_sender_external"
        ),
    )
    op.create_index("ix_messages_status", "messages", ["status"])
    op.create_index("ix_messages_sender_status", "messages", ["sender_id", "status"])
    op.create_index("ix_messages_account_id", "messages", ["account_id"])

    op.create_table(
        "delivery_events",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("message_id", sa.String(length=40), nullable=False),
        sa.Column("event", sa.String(length=40), nullable=False),
        sa.Column("detail_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_delivery_events_message_id", "delivery_events", ["message_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("action", sa.String(length=60), nullable=False),
        sa.Column("account_id", sa.String(length=40), nullable=True),
        sa.Column("sender_id", sa.String(length=40), nullable=True),
        sa.Column("detail_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_account_id", "audit_log", ["account_id"])
    op.create_index("ix_audit_sender_id", "audit_log", ["sender_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_sender_id", table_name="audit_log")
    op.drop_index("ix_audit_account_id", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_index("ix_delivery_events_message_id", table_name="delivery_events")
    op.drop_table("delivery_events")
    op.drop_index("ix_messages_account_id", table_name="messages")
    op.drop_index("ix_messages_sender_status", table_name="messages")
    op.drop_index("ix_messages_status", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_senders_account_id", table_name="senders")
    op.drop_index("ix_senders_api_key_prefix", table_name="senders")
    op.drop_table("senders")
    op.drop_table("subscriptions")
    op.drop_index("ix_accounts_email", table_name="accounts")
    op.drop_table("accounts")
