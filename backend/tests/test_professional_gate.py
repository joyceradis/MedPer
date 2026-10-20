"""Exercise the public deployment gate before authentication or database access."""
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.deps import db_session
from app.main import app


PROTECTED_REQUESTS = [
    ("POST", "/auth/register", {"json": {
        "organization_name": "Synthetic", "organization_slug": "blocked-synthetic",
        "email": "blocked@example.com", "password": "synthetic-password-2026",
    }}),
    ("POST", "/auth/token", {"data": {"username": "blocked@example.com", "password": "synthetic"}}),
    ("POST", "/auth/refresh", {"json": {"refresh_token": "synthetic"}}),
    ("GET", "/auth/me", {}),
    ("GET", "/cases", {}),
    ("POST", "/cases/import", {"json": {"title": "Synthetic"}}),
    ("POST", "/cases/v2", {"json": {"payload": {
        "schemaVersion": 2, "identity": {"title": "Synthetic"}, "context": {},
    }}}),
    ("GET", "/cases/synthetic/files", {}),
]


@pytest.mark.parametrize("environment", ["production", "staging"])
@pytest.mark.parametrize("method,path,kwargs", PROTECTED_REQUESTS)
def test_disabled_professional_routes_stop_before_database(monkeypatch, environment, method, path, kwargs):
    monkeypatch.setattr(settings, "environment", environment)
    monkeypatch.setattr(settings, "professional_enabled", False)
    # A development escape hatch must never work in a deployed environment.
    monkeypatch.setattr(settings, "development_api_enabled", True)

    def forbidden_database():
        raise AssertionError("A disabled API must not open the database")

    previous = app.dependency_overrides.copy()
    app.dependency_overrides[db_session] = forbidden_database
    try:
        with TestClient(app) as client:
            response = client.request(method, path, **kwargs)
            assert response.status_code == 503, response.text
            assert response.json()["detail"] == "Acesso profissional indisponível."
            assert client.get("/health").status_code == 200
            assert client.get("/ready").json()["professionalAccess"] == "disabled"
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_enabled_flag_without_postgres_still_blocks_routes(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "professional_enabled", True)
    monkeypatch.setattr(settings, "database_url", "sqlite:///./synthetic.db")
    with TestClient(app) as client:
        assert client.get("/cases").status_code == 503


def test_ready_professional_routes_still_require_authentication(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "professional_enabled", True)
    monkeypatch.setattr(settings, "database_url", "postgresql+psycopg://synthetic/medper")
    with TestClient(app) as client:
        assert client.get("/ready").json()["professionalAccess"] == "ready"
        assert client.get("/cases").status_code == 401


def test_development_api_is_an_explicit_local_opt_in(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "professional_enabled", False)
    monkeypatch.setattr(settings, "development_api_enabled", False)
    with TestClient(app) as client:
        assert client.get("/cases").status_code == 503
        monkeypatch.setattr(settings, "development_api_enabled", True)
        assert client.get("/cases").status_code == 401
        monkeypatch.setattr(settings, "environment", "unknown")
        assert client.get("/cases").status_code == 503
