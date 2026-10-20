"""Isolate cases by their responsible user, including within an organization.

Existing cases are assigned only when the creation audit identifies one author
in the same organization. Ambiguous records remain preserved and inaccessible.
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_case_owner"
down_revision = "0007_google_subject"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("cases")}
    if "owner_user_id" not in columns:
        with op.batch_alter_table("cases") as batch:
            batch.add_column(sa.Column("owner_user_id", sa.String(36), nullable=True))
            batch.create_foreign_key("fk_cases_owner_user", "users", ["owner_user_id"], ["id"], ondelete="SET NULL")
            batch.create_index("ix_cases_owner_user_id", ["owner_user_id"])
    # The migration runs as table owner, never as medper_app. Temporarily lift
    # FORCE (not ENABLE) inside this transaction so old rows/audits are visible
    # without inventing a tenant context. Restore the original flags atomically.
    forced = []
    if bind.dialect.name == "postgresql":
        forced = list(bind.scalars(sa.text("SELECT relname FROM pg_class WHERE relname IN ('cases','audit_log') AND relnamespace = 'public'::regnamespace AND relforcerowsecurity")))
        for table in forced:
            bind.execute(sa.text(f'ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY'))
    bind.execute(sa.text("""
        UPDATE cases SET owner_user_id = (
            SELECT MIN(a.user_id) FROM audit_log a JOIN users u ON u.id = a.user_id
            WHERE a.entity_id = cases.id AND a.entity_type = 'case'
              AND a.action IN ('create', 'create_v2', 'import')
              AND a.organization_id = cases.organization_id
              AND u.organization_id = cases.organization_id
        ) WHERE owner_user_id IS NULL AND (
            SELECT COUNT(DISTINCT a.user_id) FROM audit_log a JOIN users u ON u.id = a.user_id
            WHERE a.entity_id = cases.id AND a.entity_type = 'case'
              AND a.action IN ('create', 'create_v2', 'import')
              AND a.organization_id = cases.organization_id
              AND u.organization_id = cases.organization_id
        ) = 1
    """))
    for table in forced:
        bind.execute(sa.text(f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY'))


def downgrade():
    raise RuntimeError("Ownership cannot be removed automatically; restore a verified backup or apply a forward correction.")
