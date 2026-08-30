"""one email, one account

A unicidade era (organization_id, email): o mesmo endereço abria conta em
organizações diferentes. O login busca só por e-mail e devolvia a primeira linha
que casasse, com a organização dela — ou a segunda perita nunca entrava, sem
mensagem que explicasse, ou entrava na organização da primeira e via os casos
dela. O gatilho é banal: cadastrar duas vezes errando o slug na primeira.

Esta migração FALHA se já existir e-mail duplicado, em vez de pular em silêncio.
Criar o índice sem resolver o duplicado deixaria o buraco aberto sem aviso, e
resolver duplicata é decisão de quem opera — qual conta fica, o que acontece com
os casos da outra —, não de uma migração.
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_unique_user_email"
down_revision = "0005_case_deadlines"
branch_labels = None
depends_on = None


def _indexes() -> set[str]:
    return {ix["name"] for ix in sa.inspect(op.get_bind()).get_indexes("users")}


def _constraints() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {uc["name"] for uc in inspector.get_unique_constraints("users")}


def upgrade():
    bind = op.get_bind()

    duplicados = bind.execute(sa.text(
        "SELECT email, COUNT(*) AS n FROM users GROUP BY email HAVING COUNT(*) > 1"
    )).fetchall()
    if duplicados:
        lista = ", ".join(f"{linha[0]} ({linha[1]} contas)" for linha in duplicados)
        raise RuntimeError(
            "Há e-mails com mais de uma conta e a unicidade não pode ser aplicada "
            f"antes de resolvê-los: {lista}. Decida qual conta permanece e o destino "
            "dos casos da outra — a migração não escolhe por você."
        )

    existentes = _indexes() | _constraints()
    if "uq_users_email" not in existentes:
        op.create_index("uq_users_email", "users", ["email"], unique=True)


def downgrade():
    if "uq_users_email" in _indexes():
        op.drop_index("uq_users_email", table_name="users")
