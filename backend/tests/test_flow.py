import os
os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper.db"
os.environ["MEDPER_JWT_SECRET"] = "test-secret-that-is-longer-than-32-bytes"
from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)

def test_end_to_end_and_evidence_rule():
    register = client.post('/auth/register', json={
        "organization_name": "Org",
        "organization_slug": "org",
        "email": "a@b.com",
        "password": "correct-horse-battery"
    })
    assert register.status_code == 201
    headers = {"Authorization": "Bearer " + register.json()["access_token"]}
    case = client.post('/cases', headers=headers, json={"title": "Caso", "objectType": "Dano estético"})
    assert case.status_code == 201
    case_id = case.json()['id']
    invalid = client.post(f'/cases/{case_id}/conclusions', headers=headers, json={"title": "C", "text": "x", "evidenceIds": []})
    assert invalid.status_code == 422
    evidence = client.post(f'/cases/{case_id}/evidence', headers=headers, json={"type": "Documento", "title": "P", "description": "D"})
    assert evidence.status_code == 201
    valid = client.post(f'/cases/{case_id}/conclusions', headers=headers, json={"title": "C", "text": "x", "evidenceIds": [evidence.json()['id']]})
    assert valid.status_code == 201
