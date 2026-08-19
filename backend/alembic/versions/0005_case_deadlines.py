"""queryable deadlines and reminder ledger

Os prazos vivem dentro de `cases.state_payload`, que passou a ser cifrado — não
se consulta "o que vence em dois dias" dentro de um envelope Fernet. Estas duas
tabelas dão ao servidor o que o lembrete exige, sem criar um segundo lugar onde a
perita registre prazo: `case_deadlines` é projeção do payload, atualizada a cada
gravação de estado.

`deadline_reminders` guarda o que já foi avisado, com unicidade (prazo, marco)
imposta pelo banco: o disparador pode rodar de hora em hora, ou duas vezes por
engano, sem repetir aviso.
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_case_deadlines"
down_revision = "0004_user_full_name"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade():
    existentes = _tables()

    if "case_deadlines" not in existentes:
        op.create_table(
            "case_deadlines",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("organization_id", sa.String(length=36), nullable=False, index=True),
            sa.Column("case_id", sa.String(length=36), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("source_id", sa.String(length=64), nullable=False),
            sa.Column("kind", sa.String(length=120), nullable=False, server_default="Prazo"),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=False, index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("case_id", "source_id", name="uq_case_deadline_source"),
        )

    if "deadline_reminders" not in existentes:
        op.create_table(
            "deadline_reminders",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("deadline_id", sa.String(length=36), sa.ForeignKey("case_deadlines.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("milestone", sa.Integer(), nullable=False),
            sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("delivered", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.UniqueConstraint("deadline_id", "milestone", name="uq_deadline_reminder_milestone"),
        )


def downgrade():
    existentes = _tables()
    if "deadline_reminders" in existentes:
        op.drop_table("deadline_reminders")
    if "case_deadlines" in existentes:
        op.drop_table("case_deadlines")
