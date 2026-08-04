"""security sessions, reset tokens, encrypted files and import snapshots"""

from alembic import op
import sqlalchemy as sa

revision = "0002_security_storage"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("family_id", sa.String(36), nullable=False, index=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", sa.String(36), nullable=True),
        sa.Column("user_agent", sa.String(300), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "stored_files",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), nullable=False, index=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(255), nullable=False, unique=True),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False, index=True),
        sa.Column("encrypted", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "imported_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), nullable=False, index=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("source_schema", sa.String(160), nullable=False, server_default=""),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("imported_snapshots")
    op.drop_table("stored_files")
    op.drop_table("password_reset_tokens")
    op.drop_table("refresh_sessions")
