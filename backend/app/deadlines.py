"""Prazos: projeção consultável e motor de lembretes.

O produto exibia prazos coloridos por urgência — crítico, atenção, normal — mas
não lembrava de nada. A cor só aparece se a perita abrir o painel, que é
exatamente o que ela não faz na semana em que está ocupada. "Lembra de prazos"
era promessa de venda sem implementação.

Este módulo tem duas partes deliberadamente separadas:

- a **projeção**, que espelha para uma tabela consultável os prazos que a perita
  já registrou dentro do caso — sem criar um segundo lugar onde registrar;
- o **motor**, funções puras que decidem quais avisos são devidos agora. Sem
  banco, sem SMTP, sem relógio implícito: dá para testar o comportamento de
  virada de dia sem esperar o dia virar.

O envio em si fica em `mailer.py`; o disparo, em `scripts/send_deadline_reminders.py`.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Case, CaseDeadline, DeadlineReminder

# Marcos de aviso, em dias restantes. Uma semana para reagir, dois dias para
# priorizar, o próprio dia para não perder. Ordem decrescente importa: o marco
# devido é o maior que já foi alcançado.
MILESTONES = (7, 2, 0)


def parse_due(value) -> datetime | None:
    """Lê a data de vencimento como o frontend a grava.

    Aceita ISO com ou sem fuso. Sem fuso é interpretado como UTC — o mesmo que o
    resto do backend faz — em vez de rejeitar o valor e perder o prazo.
    """
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value.strip():
        return None
    texto = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(texto)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def days_remaining(due_at: datetime, now: datetime) -> int:
    """Dias inteiros até o vencimento, arredondando para baixo.

    Um prazo que vence em 47 horas está a 1 dia, não a 2: arredondar para cima
    faria o aviso de D-2 sair tarde demais para servir.
    """
    delta = due_at - now
    return delta.days if delta.total_seconds() >= 0 else -((-delta).days + 1)


def due_milestone(due_at: datetime, now: datetime, already_sent: set[int]) -> int | None:
    """Qual aviso é devido agora, se algum.

    Devolve o maior marco já alcançado e ainda não enviado. Assim um prazo
    cadastrado com três dias de antecedência — que nunca passou pelo marco de 7 —
    recebe o de 2 quando chegar a hora, em vez de nenhum. E um sistema que ficou
    fora do ar por uma semana envia o marco mais urgente ao voltar, não os três.
    """
    restantes = days_remaining(due_at, now)
    for marco in MILESTONES:
        if restantes <= marco and marco not in already_sent:
            return marco
    return None


def project_deadlines(db: Session, case: Case, payload: dict) -> int:
    """Espelha `operations.deadlines` do payload para a tabela consultável.

    Reconcilia por `source_id`: prazo alterado tem data atualizada, prazo
    removido do caso some da tabela — e com ele os avisos pendentes, porque
    lembrar de um prazo que a perita apagou é pior do que não lembrar.

    Um prazo cuja data mude para depois volta a ser avisado: os marcos já
    enviados para a data antiga são descartados junto.
    """
    entradas = ((payload or {}).get("operations") or {}).get("deadlines") or []

    vistos: dict[str, dict] = {}
    for item in entradas:
        if not isinstance(item, dict):
            continue
        due = parse_due(item.get("dueAt"))
        source_id = str(item.get("id") or "").strip()
        if not due or not source_id:
            continue
        vistos[source_id] = {"due_at": due, "kind": str(item.get("type") or "Prazo")[:120]}

    existentes = {
        linha.source_id: linha
        for linha in db.scalars(select(CaseDeadline).where(CaseDeadline.case_id == case.id)).all()
    }

    for source_id, dados in vistos.items():
        linha = existentes.get(source_id)
        if linha is None:
            db.add(CaseDeadline(
                organization_id=case.organization_id,
                case_id=case.id,
                source_id=source_id,
                kind=dados["kind"],
                due_at=dados["due_at"],
            ))
            continue
        if linha.due_at != dados["due_at"]:
            # Data mudou: os avisos da data antiga não valem mais.
            for aviso in db.scalars(
                select(DeadlineReminder).where(DeadlineReminder.deadline_id == linha.id)
            ).all():
                db.delete(aviso)
            linha.due_at = dados["due_at"]
        linha.kind = dados["kind"]

    for source_id, linha in existentes.items():
        if source_id not in vistos:
            db.delete(linha)

    return len(vistos)


def pending_reminders(db: Session, now: datetime | None = None) -> list[dict]:
    """Avisos devidos agora, em todas as organizações.

    Não envia nada e não escreve nada: devolve o que deve ser enviado, para que
    o disparo seja testável e para que um erro de SMTP não deixe o banco
    afirmando que avisou quando não avisou.
    """
    agora = now or datetime.now(timezone.utc)
    devidos = []

    for prazo in db.scalars(select(CaseDeadline)).all():
        due = prazo.due_at if prazo.due_at.tzinfo else prazo.due_at.replace(tzinfo=timezone.utc)
        enviados = {
            aviso.milestone
            for aviso in db.scalars(
                select(DeadlineReminder).where(DeadlineReminder.deadline_id == prazo.id)
            ).all()
        }
        marco = due_milestone(due, agora, enviados)
        if marco is None:
            continue
        caso = db.get(Case, prazo.case_id)
        if caso is None:
            continue
        devidos.append({
            "deadline_id": prazo.id,
            "organization_id": prazo.organization_id,
            "case_id": prazo.case_id,
            "case_title": caso.title or "Perícia sem título",
            "kind": prazo.kind,
            "due_at": due,
            "milestone": marco,
            "days_remaining": days_remaining(due, agora),
        })

    devidos.sort(key=lambda item: item["due_at"])
    return devidos
