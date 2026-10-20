import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.mark.parametrize('environment', ['production', 'staging'])
def test_password_reset_never_returns_a_development_token_in_deployment(monkeypatch, environment):
    with TestClient(app) as client:
        email = environment+'-recovery@example.com'
        registered = client.post('/auth/register', json={
            'organization_name':'Synthetic', 'organization_slug':environment+'-recovery',
            'email':email, 'password':'synthetic-safe-password-2026',
        })
        assert registered.status_code == 201, registered.text
        monkeypatch.setattr(settings, 'environment', environment)
        monkeypatch.setattr(settings, 'professional_enabled', True)
        # Exercise the production gate against the synthetic test engine.
        monkeypatch.setattr(settings, 'database_url', 'postgresql+psycopg://synthetic/medper')
        # This is the default value: forgetting to override it must not expose a reset token.
        monkeypatch.setattr(settings, 'public_api_url', 'http://localhost:8000')
        monkeypatch.setattr(settings, 'smtp_host', '')
        for address in [email, 'nonexistent-'+email]:
            response = client.post('/auth/forgot-password', json={'email':address})
            assert response.status_code == 200, response.text
            assert response.json() == {'message':'Se a conta existir, as instruções serão enviadas.'}
            assert response.headers['Cache-Control'] == 'no-store'


def test_auth_case_and_file_responses_are_not_cacheable(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'storage_path', str(tmp_path))
    with TestClient(app) as client:
        assert client.get('/cases').headers['Cache-Control'] == 'no-store'
        registered = client.post('/auth/register', json={
            'organization_name':'Synthetic', 'organization_slug':'private-headers',
            'email':'private-headers@example.com', 'password':'synthetic-safe-password-2026',
        })
        assert registered.status_code == 201
        assert registered.headers['Cache-Control'] == 'no-store'
        headers = {'Authorization':'Bearer '+registered.json()['access_token']}
        created = client.post('/cases', headers=headers, json={'title':'Synthetic','objectType':'Synthetic'})
        assert created.status_code == 201, created.text
        identifier = created.json()['id']
        uploaded = client.post(f'/cases/{identifier}/files',headers=headers,
                               files={'upload':('synthetic.txt',b'synthetic only','text/plain')})
        assert uploaded.status_code == 201, uploaded.text
        for path in ['/auth/me','/cases', f'/cases/{identifier}/state',
                     f'/cases/{identifier}/files/{uploaded.json()["id"]}', '/cases/nonexistent/state']:
            assert client.get(path,headers=headers).headers['Cache-Control'] == 'no-store'
