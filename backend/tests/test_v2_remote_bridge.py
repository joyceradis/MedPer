"""Synthetic V2 remote bridge tests. Never connect to a live patient database."""
from fastapi.testclient import TestClient
from cryptography.fernet import Fernet
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import Case


def _register(client, slug):
    response = client.post("/auth/register", json={
        "organization_name": slug, "organization_slug": slug,
        "email": slug + "@example.test",
        "password": "synthetic-strong-password-2026",
        "full_name": "Profissional fictício",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def _payload():
    return {
        "schemaVersion": 2, "id": "case-synthetic-client-id",
        "identity": {"title": "Perícia inteiramente fictícia", "status": "rascunho"},
        "context": {"legalContext": "civel", "object": "Avaliação simulada"},
        "sources": [{"id": "src-fake", "title": "Fonte simulada"}],
        "examination": {"summary": "Somente dados de teste."},
    }


def test_v2_atomic_create_encrypted_state_revision_and_isolation():
    assert settings.file_encryption_key_is_valid
    with TestClient(app) as client:
        alice = _register(client, "remote-v2-org-a")
        outsider = _register(client, "remote-v2-org-b")
        created = client.post("/cases/v2", headers=alice, json={"payload": _payload()})
        assert created.status_code == 201, created.text
        identifier = created.json()["id"]
        assert identifier != "case-synthetic-client-id"
        assert created.json()["revision"] == 1

        fetched = client.get(f"/cases/{identifier}/state", headers=alice)
        assert fetched.status_code == 200
        assert fetched.json()["payload"]["id"] == identifier
        assert fetched.json()["payload"]["sources"][0]["title"] == "Fonte simulada"

        with SessionLocal() as db:
            raw = db.scalar(select(Case).where(Case.id == identifier)).state_payload
            assert raw.get("__medper_encrypted__") == 1
            assert "examination" not in raw

        modified = {**fetched.json()["payload"], "examination": {"summary": "Edição fictícia protegida"}}
        saved = client.put(
            f"/cases/{identifier}/state", headers=alice,
            json={"payload": modified, "expectedRevision": 1}
        )
        assert saved.status_code == 200
        assert saved.json()["revision"] == 2
        conflict = client.put(
            f"/cases/{identifier}/state", headers=alice,
            json={"payload": _payload(), "expectedRevision": 1}
        )
        assert conflict.status_code == 409
        final = client.get(f"/cases/{identifier}/state", headers=alice).json()
        assert final["payload"]["examination"]["summary"] == "Edição fictícia protegida"
        assert final["revision"] == 2

        assert client.get(f"/cases/{identifier}/state", headers=outsider).status_code == 404
        assert client.put(
            f"/cases/{identifier}/state", headers=outsider,
            json={"payload": _payload(), "expectedRevision": 2}
        ).status_code == 404
        assert all(item["id"] != identifier for item in client.get("/cases", headers=outsider).json())


def test_v2_create_rejects_unknown_contract_and_requires_auth():
    with TestClient(app) as client:
        alice = _register(client, "remote-v2-org-c")
        for bad in (
            {"schemaVersion": 4, "identity": {"title": "Legacy"}, "context": {}},
            {"schemaVersion": 2, "identity": {"title": ""}, "context": {}},
            {"schemaVersion": 2, "identity": {}, "context": {}},
            {"schemaVersion": 2, "identity": {"title": "X"}, "context": None},
        ):
            response = client.post("/cases/v2", headers=alice, json={"payload": bad})
            assert response.status_code == 422, response.text
        assert client.post("/cases/v2", json={"payload": _payload()}).status_code == 401


def test_production_requires_encrypted_case_state(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret-strong-enough-at-least-32-bytes")
    monkeypatch.setattr(settings, "file_encryption_key", "")
    assert "case_payload_encryption_required" in settings.security_issues()
    import pytest
    with pytest.raises(RuntimeError, match="case_payload_encryption_required"):
        with TestClient(app):
            pass
    monkeypatch.setattr(settings, "file_encryption_key", Fernet.generate_key().decode())
    assert "case_payload_encryption_required" not in settings.security_issues()
