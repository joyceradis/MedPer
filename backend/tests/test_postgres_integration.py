import os

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(
    not os.getenv("MEDPER_POSTGRES_TEST"),
    reason="Teste executado apenas no job PostgreSQL",
)

from app.main import app

client = TestClient(app)


def test_postgres_rls_and_evidence_rule():
    first = client.post('/auth/register', json={
        'organization_name': 'Postgres A',
        'organization_slug': 'postgres-a',
        'email': 'postgres-a@example.com',
        'password': 'correct-horse-battery',
    })
    second = client.post('/auth/register', json={
        'organization_name': 'Postgres B',
        'organization_slug': 'postgres-b',
        'email': 'postgres-b@example.com',
        'password': 'correct-horse-battery',
    })
    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text

    h1 = {'Authorization': 'Bearer ' + first.json()['access_token']}
    h2 = {'Authorization': 'Bearer ' + second.json()['access_token']}

    case = client.post('/cases', headers=h1, json={'title': 'Isolado', 'objectType': 'Dano estético'})
    assert case.status_code == 201, case.text
    case_id = case.json()['id']

    evidence = client.post(
        f'/cases/{case_id}/evidence',
        headers=h1,
        json={'type': 'Documento', 'title': 'Fonte', 'description': 'Registro'},
    )
    assert evidence.status_code == 201, evidence.text

    conclusion = client.post(
        f'/cases/{case_id}/conclusions',
        headers=h1,
        json={'title': 'Conclusão', 'text': 'Rastreável', 'evidenceIds': [evidence.json()['id']]},
    )
    assert conclusion.status_code == 201, conclusion.text

    hidden = client.get('/cases', headers=h2)
    assert hidden.status_code == 200
    assert all(item['id'] != case_id for item in hidden.json())

    foreign_reference = client.post(
        f'/cases/{case_id}/conclusions',
        headers=h2,
        json={'title': 'Inválida', 'text': 'Não pode', 'evidenceIds': [evidence.json()['id']]},
    )
    assert foreign_reference.status_code == 404
