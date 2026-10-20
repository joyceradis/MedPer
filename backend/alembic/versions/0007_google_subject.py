"""Google OIDC identity is linked by immutable provider subject, never email.

Existing account rows remain untouched (nullable column). A Google account
cannot claim a password-based MedPer account merely by matching its email.
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_google_subject"
down_revision = "0006_unique_user_email"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    cols = {item["name"] for item in inspector.get_columns("users")}
    if "google_subject" not in cols:
        op.add_column("users", sa.Column("google_subject", sa.String(length=255), nullable=True))
    indexes = {item["name"] for item in sa.inspect(op.get_bind()).get_indexes("users")}
    if "ix_users_google_subject" not in indexes:
        op.create_index("ix_users_google_subject", "users", ["google_subject"], unique=True)


def downgrade():
    indexes = {item["name"] for item in sa.inspect(op.get_bind()).get_indexes("users")}
    if "ix_users_google_subject" in indexes:
        op.drop_index("ix_users_google_subject", table_name="users")
    cols = {item["name"] for item in sa.inspect(op.get_bind()).get_columns("users")}
    if "google_subject" in cols:
        op.drop_column("users", "google_subject")
