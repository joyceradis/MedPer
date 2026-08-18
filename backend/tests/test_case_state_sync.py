import os

os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper_state.db"
os.environ["MEDPER_JWT_SECRET"] = "test-secret-that-is-longer-than-32-bytes"

from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)


def register(slug: str, email: str):
    response = client.post('/auth/register', json={
        "organization_name": slug.upper(),
        "organization_slug": slug,
        "email": email,
        "password": "correct-horse-battery"
    })
    assert response.status_code == 201
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def create_case(headers):
    response = client.post('/cases', headers=headers, json={
        "title": "Caso de dano corporal",
        "objectType": "Dano corporal",
        "scope": "Avaliar dano corporal decorrente do evento."
    })
    assert response.status_code == 201
    return response.json()["id"]


def test_case_state_round_trip_and_revision_conflict():
    headers = register("state-org-a", "state-a@example.com")
    case_id = create_case(headers)
    payload = {
        "methodology": {
            "guided": {
                "personalDamageDamageStatus": "Sim",
                "personalDamageCausalStatus": "Nexo sustentado",
                "personalDamageConsolidationStatus": "Consolidado",
                "scarQualityStatus": "Sim",
                "posasPatient_pain": "2"
            }
        }
    }

    saved = client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": payload,
        "expectedRevision": 0
    })
    assert saved.status_code == 200
    assert saved.json()["revision"] == 1

    loaded = client.get(f'/cases/{case_id}/state', headers=headers)
    assert loaded.status_code == 200
    assert loaded.json()["revision"] == 1
    assert loaded.json()["payload"] == payload

    conflict = client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": {"methodology": {"guided": {"personalDamageDamageStatus": "Não"}}},
        "expectedRevision": 0
    })
    assert conflict.status_code == 409


def test_case_state_is_organization_scoped():
    owner = register("state-org-b", "state-b@example.com")
    outsider = register("state-org-c", "state-c@example.com")
    case_id = create_case(owner)

    assert client.get(f'/cases/{case_id}/state', headers=outsider).status_code == 404
    assert client.put(f'/cases/{case_id}/state', headers=outsider, json={
        "payload": {}, "expectedRevision": 0
    }).status_code == 404
