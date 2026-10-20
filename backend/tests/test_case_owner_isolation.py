"""Use real API sessions and, on PostgreSQL, the restricted database role."""
import os
from datetime import datetime, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app.config import settings
from app.db import SessionLocal
from app.deps import set_request_context
from app.main import app
from app.models import User
from app.security import create_access_token, hash_password


def _team(client, slug):
    response = client.post('/auth/register', json={
        'organization_name': 'Synthetic team', 'organization_slug': slug,
        'email': slug + '@example.com', 'password': 'synthetic-password-2026',
    })
    assert response.status_code == 201, response.text
    alice_headers = {'Authorization': 'Bearer ' + response.json()['access_token']}
    identity = client.get('/auth/me', headers=alice_headers).json()
    with SessionLocal() as db:
        alice = db.get(User, identity['id'])
        # Both are admins: an organization role does not grant case access.
        bob = User(organization_id=alice.organization_id, email=slug+'-bob@example.com',
                   password_hash=hash_password('synthetic-password-2026'), role='admin')
        db.add(bob)
        db.commit()
        return alice, bob, alice_headers, {'Authorization': 'Bearer ' + create_access_token(bob.id, bob.organization_id)}


@pytest.mark.parametrize('creation', ['legacy', 'v2', 'import'])
def test_same_organization_cannot_read_change_delete_or_attach_to_another_users_case(creation, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'storage_path', str(tmp_path))
    with TestClient(app) as client:
        alice, bob, h1, h2 = _team(client, 'owner-api-'+creation)
        if creation == 'v2':
            created = client.post('/cases/v2', headers=h1, json={'payload': {
                'schemaVersion': 2, 'identity': {'title': 'Synthetic private case'}, 'context': {},
            }})
            revision = 1
        else:
            created = client.post('/cases/import' if creation == 'import' else '/cases', headers=h1,
                                  json={'title': 'Synthetic private case', 'objectType': 'Synthetic'})
            revision = 0
        assert created.status_code == 201, created.text
        case_id = created.json()['id']
        file = client.post(f'/cases/{case_id}/files', headers=h1,
                           files={'upload': ('synthetic.txt', b'synthetic private bytes', 'text/plain')})
        assert file.status_code == 201, file.text
        file_id = file.json()['id']
        before = client.get(f'/cases/{case_id}/state', headers=h1).json()
        assert client.get('/cases', headers=h2).json() == []
        attempts = [
            ('GET', f'/cases/{case_id}/state', {}),
            ('PUT', f'/cases/{case_id}/state', {'json': {'payload': {}, 'expectedRevision': revision}}),
            ('DELETE', f'/cases/{case_id}', {}),
            ('GET', f'/cases/{case_id}/files', {}),
            ('GET', f'/cases/{case_id}/files/{file_id}', {}),
            ('POST', f'/cases/{case_id}/files', {'files': {'upload': ('x.txt', b'x', 'text/plain')}}),
            ('POST', f'/cases/{case_id}/evidence', {'json': {'type': 'Document', 'title': 'x', 'description': 'x'}}),
            ('POST', f'/cases/{case_id}/observations', {'json': {'evidenceId': 'synthetic-id', 'title': 'x', 'text': 'x'}}),
            ('POST', f'/cases/{case_id}/findings', {'json': {'type': 'x', 'title': 'x', 'description': 'x'}}),
            ('POST', f'/cases/{case_id}/conclusions', {'json': {'title': 'x', 'text': 'x', 'evidenceIds': ['synthetic-id']}}),
        ]
        for method, path, kwargs in attempts:
            response = client.request(method, path, headers=h2, **kwargs)
            assert response.status_code == 404, (method, path, response.text)
        assert client.get(f'/cases/{case_id}/state', headers=h1).json() == before
        assert client.get(f'/cases/{case_id}/files/{file_id}', headers=h1).content == b'synthetic private bytes'
        assert len(list(tmp_path.iterdir())) == 1


@pytest.mark.skipif(os.getenv('MEDPER_POSTGRES_TEST') != '1', reason='Requires restricted PostgreSQL role')
def test_postgres_rls_blocks_raw_sql_for_a_colleague_and_without_context():
    with TestClient(app) as client:
        alice, bob, h1, h2 = _team(client, 'owner-raw-sql')
        case_id = client.post('/cases', headers=h1, json={'title': 'Private', 'objectType': 'Synthetic'}).json()['id']
        assert client.put(f'/cases/{case_id}/state', headers=h1, json={'expectedRevision': 0, 'payload': {
            'operations': {'deadlines': [{'id': 'd1', 'type': 'Synthetic', 'dueAt': '2026-10-20T12:00:00Z'}]}
        }}).status_code == 200
        evidence_id = client.post(f'/cases/{case_id}/evidence', headers=h1,
                                  json={'type': 'x', 'title': 'x', 'description': 'x'}).json()['id']
        finding_id = client.post(f'/cases/{case_id}/findings', headers=h1,
                                 json={'type': 'x', 'title': 'x', 'description': 'x', 'evidenceIds': [evidence_id]}).json()['id']
    with SessionLocal() as db:
        role = db.execute(text('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')).one()
        assert role == (False, False)
        assert db.scalar(text('SELECT count(*) FROM cases')) == 0
        set_request_context(db, alice)
        assert db.scalar(text('SELECT count(*) FROM cases WHERE id=:id'), {'id': case_id}) == 1
        assert db.scalar(text('SELECT count(*) FROM case_deadlines WHERE case_id=:id'), {'id': case_id}) == 1
        assert db.scalar(text('SELECT count(*) FROM finding_evidence WHERE finding_id=:id'), {'id': finding_id}) == 1
        set_request_context(db, bob)
        for table, column, identifier in [('cases','id',case_id), ('evidence','case_id',case_id),
                                           ('case_deadlines','case_id',case_id), ('finding_evidence','finding_id',finding_id)]:
            assert db.scalar(text(f'SELECT count(*) FROM {table} WHERE {column}=:id'), {'id': identifier}) == 0
        assert db.execute(text('UPDATE cases SET title=:title WHERE id=:id'), {'title': 'Forbidden', 'id': case_id}).rowcount == 0
        with pytest.raises(DBAPIError):
            db.execute(text('INSERT INTO evidence (id,case_id,type,title,description,date,reliability) VALUES (:id,:case_id,:type,:title,:description,:date,:reliability)'),
                       {'id': 'forbidden', 'case_id': case_id, 'type': 'x', 'title': 'x', 'description': 'x', 'date': '', 'reliability': 'x'})
        db.rollback()
        # Context is transaction-local and must not survive pool reuse.
        assert db.scalar(text('SELECT count(*) FROM cases')) == 0


def test_reminders_go_only_to_the_case_owner(monkeypatch):
    with TestClient(app) as client:
        alice, bob, h1, h2 = _team(client, 'owner-reminder')
        case_id = client.post('/cases', headers=h1, json={'title': 'Private', 'objectType': 'Synthetic'}).json()['id']
        assert client.put(f'/cases/{case_id}/state', headers=h1, json={'expectedRevision': 0, 'payload': {
            'operations': {'deadlines': [{'id': 'd1', 'type': 'Synthetic', 'dueAt': '2000-01-01T12:00:00Z'}]}
        }}).status_code == 200
    spec = spec_from_file_location('owner_reminder_worker', Path(__file__).resolve().parents[1] / 'scripts/send_deadline_reminders.py')
    worker = module_from_spec(spec)
    spec.loader.exec_module(worker)
    sent = []
    monkeypatch.setattr(worker, 'send_deadline_reminder', lambda email, reminder: sent.append((email, reminder['case_id'])) or True)
    worker.executar(agora=datetime(2026, 10, 20, tzinfo=timezone.utc))
    assert [email for email, identifier in sent if identifier == case_id] == [alice.email]
    assert bob.email not in [email for email, identifier in sent if identifier == case_id]
