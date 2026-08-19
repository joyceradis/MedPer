import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, Table, Column, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def uid() -> str:
    return str(uuid.uuid4())

def now() -> datetime:
    return datetime.now(timezone.utc)

finding_evidence = Table(
    "finding_evidence", Base.metadata,
    Column("finding_id", ForeignKey("findings.id", ondelete="CASCADE"), primary_key=True),
    Column("evidence_id", ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True),
)
finding_observation = Table(
    "finding_observation", Base.metadata,
    Column("finding_id", ForeignKey("findings.id", ondelete="CASCADE"), primary_key=True),
    Column("observation_id", ForeignKey("observations.id", ondelete="CASCADE"), primary_key=True),
)
conclusion_evidence = Table(
    "conclusion_evidence", Base.metadata,
    Column("conclusion_id", ForeignKey("conclusions.id", ondelete="CASCADE"), primary_key=True),
    Column("evidence_id", ForeignKey("evidence.id", ondelete="RESTRICT"), primary_key=True),
)
conclusion_finding = Table(
    "conclusion_finding", Base.metadata,
    Column("conclusion_id", ForeignKey("conclusions.id", ondelete="CASCADE"), primary_key=True),
    Column("finding_id", ForeignKey("findings.id", ondelete="RESTRICT"), primary_key=True),
)

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class User(Base):
    __tablename__ = "users"
    # O e-mail identifica a conta em TODO o sistema, não dentro da organização.
    # Com a unicidade anterior — (organization_id, email) — o mesmo endereço abria
    # conta em organizações diferentes, e o login, que busca só por e-mail,
    # devolvia a primeira linha que casasse: ou a segunda perita nunca entrava,
    # ou entrava na organização da primeira e via os casos dela.
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    # Nome profissional exibido na interface. Anulável de propósito: contas
    # criadas antes desta coluna continuam válidas e a interface trata a
    # ausência sem inventar um nome.
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="perito")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Case(Base):
    __tablename__ = "cases"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    reference: Mapped[str] = mapped_column(String(120), default="")
    object_type: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="Em coleta")
    scope: Mapped[str] = mapped_column(Text, default="")
    state_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    state_revision: Mapped[int] = mapped_column(Integer, default=0)
    state_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    evidence: Mapped[list["Evidence"]] = relationship(back_populates="case", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    date: Mapped[str] = mapped_column(String(32), default="")
    reliability: Mapped[str] = mapped_column(String(40), default="Não classificada")
    case: Mapped[Case] = relationship(back_populates="evidence")

class Observation(Base):
    __tablename__ = "observations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    text: Mapped[str] = mapped_column(Text)

class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(30), default="Não classificada")
    evidence: Mapped[list[Evidence]] = relationship(secondary=finding_evidence)
    observations: Mapped[list[Observation]] = relationship(secondary=finding_observation)

class Conclusion(Base):
    __tablename__ = "conclusions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="Preliminar")
    evidence: Mapped[list[Evidence]] = relationship(secondary=conclusion_evidence)
    findings: Mapped[list[Finding]] = relationship(secondary=conclusion_finding)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str] = mapped_column(String(36))
    payload: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CaseDeadline(Base):
    """Projeção consultável dos prazos que a perita registrou no caso.

    Os prazos vivem dentro de `cases.state_payload`, que agora é cifrado — não se
    consulta "o que vence em dois dias" dentro de um envelope Fernet. Esta tabela
    é mantida a cada gravação de estado a partir do próprio payload, de modo que
    continua havendo um único lugar onde a perita registra prazo, e o servidor
    ganha o que precisa para lembrar.

    Guarda só o que o lembrete exige: tipo e vencimento. Nada de conteúdo clínico,
    nada do número do processo.
    """

    __tablename__ = "case_deadlines"
    __table_args__ = (UniqueConstraint("case_id", "source_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36), index=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    # Identificador do prazo dentro do payload, para reconciliar sem duplicar.
    source_id: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(120), default="Prazo")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DeadlineReminder(Base):
    """Registro do que já foi avisado.

    A unicidade (prazo, marco) é garantida pelo banco e não pela aplicação: o
    disparador pode rodar de hora em hora, ou duas vezes por engano, sem nunca
    enviar o mesmo aviso duas vezes. Também serve de trilha do que a perita foi
    de fato avisada — útil quando alguém perde um prazo e pergunta por quê.
    """

    __tablename__ = "deadline_reminders"
    __table_args__ = (UniqueConstraint("deadline_id", "milestone"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    deadline_id: Mapped[str] = mapped_column(ForeignKey("case_deadlines.id", ondelete="CASCADE"), index=True)
    # Dias restantes no marco em que o aviso foi disparado: 7, 2 ou 0.
    milestone: Mapped[int] = mapped_column(Integer)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    delivered: Mapped[bool] = mapped_column(Boolean, default=True)
