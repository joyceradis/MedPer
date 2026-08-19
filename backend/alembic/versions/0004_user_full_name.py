"""professional display name on users

A interface exibia um nome fixo no código porque não havia de onde ler o nome de
quem estava logada — a tabela `users` guardava apenas e-mail, papel e organização.
O cadastro do frontend já enviava `full_name`, que era descartado em silêncio.

A coluna é anulável de propósito: contas criadas antes desta migração continuam
válidas, e a interface trata a ausência sem inventar um nome.
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_user_full_name"
down_revision = "0003_case_state_sync"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade():
    if "full_name" not in _columns("users"):
        op.add_column("users", sa.Column("full_name", sa.String(length=160), nullable=True))


def downgrade():
    if "full_name" in _columns("users"):
        op.drop_column("users", "full_name")
