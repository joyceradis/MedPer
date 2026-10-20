"""Commercial safety gate: synthetic cases, never real case data.

Until a case-grant/owner model is implemented, organization-wide access is
inadequate for teams. This tests a deliberate fail-closed single-user pilot.
"""
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import Case, User
from app.security import hash_password


def _register(client, slug):
    result = client.post("/auth/register", json={
        "organization_name": slug, "organization_slug": slug,
        "email": slug + "@example.com",
        "password": "synthetic-only-audited-password-2026",
        "full_name": "Test professional",
    })
    assert result.status_code == 201, result.text
    return {"Authorization": "Bearer " + result.json()["access_token"]}


def _synthetic_case(client, headers):
    response = client.post("/cases/v2", headers=headers, json={
        "payload": {
            "schemaVersion": 2,
            "identity": {"title": "Synthetic forensic case", "status": "rascunho"},
            "context": {"object": "Fictitious only"},
            "sources": [],
        }
    })
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_single_user_organization_still_creates_and_reads_synthetic_case():
    with TestClient(app) as client:
        owner = _register(client, "pilot-single-user")
        case_id = _synthetic_case(client, owner)
        response = client.get("/cases/" + case_id + "/state", headers=owner)
        assert response.status_code == 200
        assert response.json()["payload"]["identity"]["title"] == "Synthetic forensic case"


def test_second_account_in_same_org_never_inherits_access_to_first_users_cases():
    with TestClient(app) as client:
        owner = _register(client, "pilot-shared-org")
        case_id = _synthetic_case(client, owner)
        with SessionLocal() as db:
            account = db.scalar(select(User).where(User.email == "pilot-shared-org@example.com"))
            outsider = User(
                organization_id=account.organization_id,
                email="colleague-no-grants@example.com",
                password_hash=hash_password("synthetic-colleague-password-2026"),
                full_name="Synthetic colleague",
                role="perito",
            )
            db.add(outsider)
            db.commit()
        colleague_login = client.post("/auth/token", data={
            "username": "colleague-no-grants@example.com",
            "password": "synthetic-colleague-password-2026",
        })
        assert colleague_login.status_code == 200, colleague_login.text
        colleague = {"Authorization": "Bearer " + colleague_login.json()["access_token"]}

        # The full case surface, not just state GET, must fail closed for both
        # individuals until explicit per-case authorization exists.
        for user in (owner, colleague):
            assert client.get("/cases", headers=user).status_code == 403
            assert client.get(f"/cases/{case_id}/state", headers=user).status_code == 403
            assert client.put(f"/cases/{case_id}/state", headers=user, json={
                "payload": {"schemaVersion": 2}, "expectedRevision": 1
            }).status_code == 403
            assert client.post("/cases", headers=user, json={
                "title": "Should never persist", "objectType": "Synthetic"
            }).status_code == 403
            assert client.post("/cases/import", headers=user, json={
                "title": "Should not import"
            }).status_code == 403
            assert client.get(f"/cases/{case_id}/files", headers=user).status_code == 403
            assert client.delete(f"/cases/{case_id}", headers=user).status_code == 403

        with SessionLocal() as db:
            existing = db.get(Case, case_id)
            assert existing is not None, "Denial must not delete the existing case"
            assert existing.state_revision == 1
            # Deactivating the second account must not silently reopen
            # organization-wide access to cases created by a colleague.
            outsider = db.scalar(select(User).where(User.email == "colleague-no-grants@example.com"))
            outsider.is_active = False
            db.commit()
        assert client.get(f"/cases/{case_id}/state", headers=owner).status_code == 403


def test_production_disallows_public_registration_by_default(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "open_registration_enabled", False)
    with TestClient(app) as client:
        response = client.post("/auth/register", json={
            "organization_name": "Synthetic production",
            "organization_slug": "pilot-closed-registration",
            "email": "new-pilot@example.com",
            "password": "synthetic-password-must-not-register",
        })
        assert response.status_code == 403, response.text
        assert "indisponível" in response.json()["detail"]


def test_unauthenticated_case_requests_remain_unauthorized():
    with TestClient(app) as client:
        assert client.get("/cases").status_code == 401
        assert client.post("/cases/import", json={"title": "Synthetic"}).status_code == 401
