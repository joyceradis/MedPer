"""versioned case state payload for MedPer sync"""

from alembic import op
import sqlalchemy as sa

revision = "0003_case_state_sync"
down_revision = "0002_security_storage"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade():
    columns = _columns("cases")
    if "state_payload" not in columns:
        op.add_column("cases", sa.Column("state_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    if "state_revision" not in columns:
        op.add_column("cases", sa.Column("state_revision", sa.Integer(), nullable=False, server_default="0"))
    if "state_updated_at" not in columns:
        op.add_column("cases", sa.Column("state_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    columns = _columns("cases")
    if "state_updated_at" in columns:
        op.drop_column("cases", "state_updated_at")
    if "state_revision" in columns:
        op.drop_column("cases", "state_revision")
    if "state_payload" in columns:
        op.drop_column("cases", "state_payload")
