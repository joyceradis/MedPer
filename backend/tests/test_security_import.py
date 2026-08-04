from pathlib import Path

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def register(slug: str, email: str):
    response = client.post('/auth/register', json={
        'organization_name': slug,
        'organization_slug': slug,
        'email': email,
        'password': 'correct-horse-battery',
    })
    assert response.status_code == 201, response.text
    return response.json()


def test_refresh_rotation_and_reuse_detection():
    tokens = register('phase2-refresh', 'refresh@example.com')
    first = client.post('/auth/refresh', json={'refresh_token': tokens['refresh_token']})
    assert first.status_code == 200, first.text
    assert first.json()['refresh_token'] != tokens['refresh_token']

    reused = client.post('/auth/refresh', json={'refresh_token': tokens['refresh_token']})
    assert reused.status_code == 401

    family_revoked = client.post('/auth/refresh', json={'refresh_token': first.json()['refresh_token']})
    assert family_revoked.status_code == 401


def test_password_reset_revokes_sessions():
    tokens = register('phase2-reset', 'reset@example.com')
    forgot = client.post('/auth/forgot-password', json={'email': 'reset@example.com'})
    assert forgot.status_code == 200
    reset_token = forgot.json()['development_token']

    reset = client.post('/auth/reset-password', json={
        'token': reset_token,
        'new_password': 'new-correct-horse-battery',
    })
    assert reset.status_code == 200, reset.text

    revoked = client.post('/auth/refresh', json={'refresh_token': tokens['refresh_token']})
    assert revoked.status_code == 401

    login = client.post('/auth/token', data={
        'username': 'reset@example.com',
        'password': 'new-correct-horse-battery',
    })
    assert login.status_code == 200


def test_complete_import_preserves_snapshot_and_evidence_rule():
    tokens = register('phase2-import', 'import@example.com')
    headers = {'Authorization': 'Bearer ' + tokens['access_token']}
    payload = {
        'schema': 'https://joyceradis.github.io/MedPer/data/mlks.schema.json',
        'exportedAt': '2026-08-04T00:00:00Z',
        'application': 'MedPer PWA',
        'case': {
            'id': 'case_frontend',
            'title': 'Caso importado',
            'reference': 'PROC-001',
            'objectType': 'Dano estético',
            'status': 'Em análise',
            'scope': 'Objeto delimitado pelo juízo.',
            'events': [{'id': 'evt_1', 'date': '2026-01-01', 'title': 'Evento', 'description': 'Descrição'}],
            'evidence': [{'id': 'ev_1', 'type': 'Documento', 'title': 'Prontuário', 'description': 'Registro', 'date': '2026-01-01', 'reliability': 'Primária'}],
            'observations': [{'id': 'obs_1', 'sourceId': 'ev_1', 'title': 'Observação', 'text': 'Achado objetivo'}],
            'findings': [{'id': 'find_1', 'type': 'Lesão', 'title': 'Cicatriz', 'description': 'Descrição', 'evidenceIds': ['ev_1'], 'observationIds': ['obs_1']}],
            'conclusions': [
                {'id': 'c_1', 'title': 'Rastreável', 'text': 'Conclusão válida', 'evidenceIds': ['ev_1'], 'findingIds': ['find_1']},
                {'id': 'c_2', 'title': 'Sem fonte', 'text': 'Deve ser recusada', 'evidenceIds': [], 'findingIds': []},
            ],
            'aipe': {'category': 'importantissimo', 'score': 41},
            'questions': [{'text': 'Há dano estético?', 'answer': 'Sim'}],
        },
    }
    response = client.post('/cases/import', headers=headers, json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body['rawSnapshotPreserved'] is True
    assert body['imported'] == {'evidence': 1, 'observations': 1, 'findings': 1, 'conclusions': 1}
    assert body['skippedConclusionsWithoutEvidence'] == 1


def test_file_upload_is_encrypted_at_rest(tmp_path: Path):
    tokens = register('phase2-files', 'files@example.com')
    headers = {'Authorization': 'Bearer ' + tokens['access_token']}
    case = client.post('/cases', headers=headers, json={'title': 'Arquivos', 'objectType': 'Dano corporal'})
    assert case.status_code == 201

    settings.file_encryption_key = Fernet.generate_key().decode('ascii')
    settings.storage_path = str(tmp_path)
    raw = b'conteudo medico confidencial'
    upload = client.post(
        f"/cases/{case.json()['id']}/files",
        headers=headers,
        files={'upload': ('documento.txt', raw, 'text/plain')},
    )
    assert upload.status_code == 201, upload.text
    stored = next(tmp_path.iterdir()).read_bytes()
    assert raw not in stored

    download = client.get(f"/cases/{case.json()['id']}/files/{upload.json()['id']}", headers=headers)
    assert download.status_code == 200
    assert download.content == raw
