import os
os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper_deadlines.db"

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, engine, SessionLocal
from app.deadlines import MILESTONES, days_remaining, due_milestone, parse_due, pending_reminders
from app.main import app
from app.models import CaseDeadline, DeadlineReminder

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)

AGORA = datetime(2026, 8, 19, 12, 0, tzinfo=timezone.utc)


def _conta(slug: str) -> dict:
    resposta = client.post('/auth/register', json={
        "organization_name": slug, "organization_slug": slug,
        "full_name": "Perita de Teste", "email": f"{slug}@exemplo.br",
        "password": "correct-horse-battery"
    })
    assert resposta.status_code == 201
    return {"Authorization": "Bearer " + resposta.json()["access_token"]}


def _caso(headers: dict, titulo: str = "Caso") -> str:
    return client.post('/cases', headers=headers, json={
        "title": titulo, "objectType": "Dano estético"
    }).json()['id']


def _salvar(headers: dict, case_id: str, prazos: list, revisao: int = 0):
    resposta = client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": {"operations": {"deadlines": prazos}}, "expectedRevision": revisao
    })
    assert resposta.status_code == 200, resposta.text
    return resposta


# ---------------------------------------------------------------- lógica pura

def test_days_remaining_rounds_down_so_the_warning_is_not_late():
    # 47 horas é 1 dia, não 2. Arredondar para cima faria o aviso de D-2 sair
    # depois de o prazo já estar a menos de dois dias — tarde para servir.
    assert days_remaining(AGORA + timedelta(hours=47), AGORA) == 1
    assert days_remaining(AGORA + timedelta(hours=49), AGORA) == 2
    assert days_remaining(AGORA + timedelta(hours=1), AGORA) == 0
    assert days_remaining(AGORA - timedelta(hours=1), AGORA) == -1


def test_the_due_milestone_is_the_largest_one_already_reached():
    em_dez = AGORA + timedelta(days=10)
    em_cinco = AGORA + timedelta(days=5)
    hoje = AGORA + timedelta(hours=3)

    assert due_milestone(em_dez, AGORA, set()) is None, "faltando dez dias não se avisa"
    assert due_milestone(em_cinco, AGORA, set()) == 7, "já passou do marco de uma semana"
    assert due_milestone(em_cinco, AGORA, {7}) is None, "não repete o que já foi avisado"
    assert due_milestone(hoje, AGORA, {7, 2}) == 0


def test_a_deadline_registered_late_still_gets_the_urgent_warning():
    # Cadastrado com três dias de antecedência: nunca passou pelo marco de 7.
    # Precisa receber o de 2 quando chegar a hora, em vez de nenhum.
    tres_dias = AGORA + timedelta(days=3)
    assert due_milestone(tres_dias, AGORA, set()) == 7
    # Dois dias depois falta um dia: o marco devido é o de 2, ainda não enviado.
    dois_dias_depois = AGORA + timedelta(days=2)
    assert due_milestone(tres_dias, dois_dias_depois, {7}) == 2
    # Faltando um dia, o marco do próprio dia ainda não chegou.
    assert due_milestone(tres_dias, dois_dias_depois, {7, 2}) is None
    # Ele chega no dia do vencimento, e só então.
    no_dia = AGORA + timedelta(days=3)
    assert due_milestone(tres_dias, no_dia, {7, 2}) == 0


def test_an_outage_sends_the_most_urgent_milestone_not_all_three():
    # Sistema fora do ar por uma semana: ao voltar, um aviso, não três.
    vence = AGORA + timedelta(hours=6)
    assert due_milestone(vence, AGORA, set()) == 7
    assert MILESTONES == (7, 2, 0)


def test_an_overdue_deadline_still_reports_the_final_milestone():
    vencido = AGORA - timedelta(days=1)
    assert due_milestone(vencido, AGORA, set()) == 7
    assert due_milestone(vencido, AGORA, {7, 2}) == 0
    assert due_milestone(vencido, AGORA, {7, 2, 0}) is None


def test_parse_due_accepts_what_the_frontend_writes():
    assert parse_due("2026-08-25T17:00:00").tzinfo is not None, "sem fuso é lido como UTC"
    assert parse_due("2026-08-25T17:00:00Z") == datetime(2026, 8, 25, 17, 0, tzinfo=timezone.utc)
    assert parse_due("2026-08-25T17:00:00+00:00") is not None
    assert parse_due("") is None
    assert parse_due("nada disso") is None
    assert parse_due(None) is None


# --------------------------------------------------------------- projeção

def test_saving_a_case_mirrors_its_deadlines_into_the_queryable_table():
    headers = _conta("proj")
    case_id = _caso(headers, "Sequela em membro superior")
    _salvar(headers, case_id, [
        {"id": "d1", "type": "Entrega do laudo", "dueAt": "2026-08-25T17:00:00"},
        {"id": "d2", "type": "Perícia presencial", "dueAt": "2026-09-02T09:30:00"},
    ])

    with SessionLocal() as db:
        linhas = db.scalars(select(CaseDeadline).where(CaseDeadline.case_id == case_id)).all()
    assert len(linhas) == 2
    assert {linha.kind for linha in linhas} == {"Entrega do laudo", "Perícia presencial"}


def test_editing_and_removing_deadlines_reconciles_instead_of_duplicating():
    headers = _conta("recon")
    case_id = _caso(headers)
    _salvar(headers, case_id, [
        {"id": "d1", "type": "Laudo", "dueAt": "2026-08-25T17:00:00"},
        {"id": "d2", "type": "Exame", "dueAt": "2026-09-02T09:30:00"},
    ], revisao=0)

    # d2 removido, d1 adiado.
    _salvar(headers, case_id, [
        {"id": "d1", "type": "Laudo", "dueAt": "2026-08-28T17:00:00"},
    ], revisao=1)

    with SessionLocal() as db:
        linhas = db.scalars(select(CaseDeadline).where(CaseDeadline.case_id == case_id)).all()
    assert len(linhas) == 1, "prazo apagado do caso some da tabela"
    assert linhas[0].source_id == "d1"
    assert linhas[0].due_at.day == 28, "prazo adiado tem a data atualizada"


def test_postponing_a_deadline_lets_it_warn_again():
    headers = _conta("adiado")
    case_id = _caso(headers)
    _salvar(headers, case_id, [{"id": "d1", "type": "Laudo", "dueAt": "2026-08-20T17:00:00"}])

    with SessionLocal() as db:
        prazo = db.scalar(select(CaseDeadline).where(CaseDeadline.case_id == case_id))
        db.add(DeadlineReminder(deadline_id=prazo.id, milestone=7))
        db.commit()

    # Adiado em um mês: os avisos da data antiga não valem mais.
    _salvar(headers, case_id, [{"id": "d1", "type": "Laudo", "dueAt": "2026-09-20T17:00:00"}], revisao=1)

    with SessionLocal() as db:
        prazo = db.scalar(select(CaseDeadline).where(CaseDeadline.case_id == case_id))
        avisos = db.scalars(select(DeadlineReminder).where(DeadlineReminder.deadline_id == prazo.id)).all()
    assert avisos == [], "aviso da data antiga é descartado ao adiar"


def test_malformed_deadlines_are_skipped_without_losing_the_good_ones():
    headers = _conta("sujo")
    case_id = _caso(headers)
    _salvar(headers, case_id, [
        {"id": "bom", "type": "Laudo", "dueAt": "2026-08-25T17:00:00"},
        {"id": "sem-data", "type": "Laudo"},
        {"type": "sem id", "dueAt": "2026-08-25T17:00:00"},
        {"id": "data-ruim", "dueAt": "trinta de agosto"},
        "isto nem é objeto",
    ])
    with SessionLocal() as db:
        linhas = db.scalars(select(CaseDeadline).where(CaseDeadline.case_id == case_id)).all()
    assert [linha.source_id for linha in linhas] == ["bom"]


def test_deleting_the_case_takes_its_deadlines_with_it():
    headers = _conta("apaga")
    case_id = _caso(headers)
    _salvar(headers, case_id, [{"id": "d1", "type": "Laudo", "dueAt": "2026-08-25T17:00:00"}])
    assert client.delete(f'/cases/{case_id}', headers=headers).status_code == 200
    with SessionLocal() as db:
        assert db.scalars(select(CaseDeadline).where(CaseDeadline.case_id == case_id)).all() == []


# --------------------------------------------------------------- motor

def test_pending_reminders_reports_what_is_due_and_never_repeats():
    headers = _conta("motor")
    case_id = _caso(headers, "Nexo causal")
    vence = AGORA + timedelta(days=5)
    _salvar(headers, case_id, [
        {"id": "d1", "type": "Entrega do laudo", "dueAt": vence.isoformat()},
    ])

    with SessionLocal() as db:
        devidos = [a for a in pending_reminders(db, AGORA) if a["case_id"] == case_id]
        assert len(devidos) == 1
        aviso = devidos[0]
        assert aviso["milestone"] == 7
        assert aviso["kind"] == "Entrega do laudo"
        assert aviso["case_title"] == "Nexo causal"
        assert aviso["days_remaining"] == 5

        db.add(DeadlineReminder(deadline_id=aviso["deadline_id"], milestone=7))
        db.commit()

        repetidos = [a for a in pending_reminders(db, AGORA) if a["case_id"] == case_id]
        assert repetidos == [], "o mesmo marco não sai duas vezes"


def test_the_reminder_ledger_refuses_a_duplicate_at_the_database_level():
    """A idempotência é do banco, não da aplicação: o disparador pode rodar duas
    vezes por engano sem que isso dependa de acerto no código que chama."""
    import sqlalchemy.exc

    headers = _conta("unico")
    case_id = _caso(headers)
    _salvar(headers, case_id, [{"id": "d1", "type": "Laudo", "dueAt": "2026-08-25T17:00:00"}])

    with SessionLocal() as db:
        prazo = db.scalar(select(CaseDeadline).where(CaseDeadline.case_id == case_id))
        db.add(DeadlineReminder(deadline_id=prazo.id, milestone=2))
        db.commit()

    with SessionLocal() as db:
        db.add(DeadlineReminder(deadline_id=prazo.id, milestone=2))
        try:
            db.commit()
            assert False, "o banco precisa recusar o marco repetido"
        except sqlalchemy.exc.IntegrityError:
            db.rollback()


def test_a_far_off_deadline_produces_no_reminder():
    headers = _conta("longe")
    case_id = _caso(headers)
    _salvar(headers, case_id, [
        {"id": "d1", "type": "Laudo", "dueAt": (AGORA + timedelta(days=40)).isoformat()},
    ])
    with SessionLocal() as db:
        assert [a for a in pending_reminders(db, AGORA) if a["case_id"] == case_id] == []
