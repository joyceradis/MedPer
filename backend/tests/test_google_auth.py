"""Google identity tests: signed JWT validation and linking without email takeover.

Tests contain synthetic accounts and locally signed RSA JWTs; no Google
credentials, actual network requests or user information are required.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.config import settings
from app.google_identity import verify_google_credential
from app.main import app
from app.routers import google_auth


PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBLIC_KEY = PRIVATE_KEY.public_key()
CREDENTIAL = "synthetic-id-token-must-be-long"


def claims(**overrides):
    now = datetime.now(timezone.utc)
    result = {
        "iss": "https://accounts.google.com",
        "sub": "google-provider-subject-1001",
        "aud": "sample-client.apps.googleusercontent.com",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "email": "doctor@example.com",
        "email_verified": True,
        "name": "Professional Test Only",
    }
    result.update(overrides)
    return result


def token(**overrides):
    return jwt.encode(claims(**overrides), PRIVATE_KEY, algorithm="RS256", headers={"kid": "fake-test-key"})


def enable_oauth(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "sample-client.apps.googleusercontent.com")
    monkeypatch.setattr(type(settings), "professional_access_ready", property(lambda self: True))
    monkeypatch.setattr(settings, "google_self_signup_enabled", False)
    import app.google_identity as identities
    monkeypatch.setattr(identities, "signing_keys", lambda: SimpleNamespace(
        get_signing_key_from_jwt=lambda raw: SimpleNamespace(key=PUBLIC_KEY)
    ))


def register(client, slug, email):
    response = client.post("/auth/register", json={
        "organization_name": slug, "organization_slug": slug,
        "email": email, "password": "safe-synthetic-password-2026",
        "full_name": "Test Account",
    })
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def test_rejects_unsigned_wrong_audience_issuer_expired_and_email_unverified(monkeypatch):
    enable_oauth(monkeypatch)
    valid = verify_google_credential(token())
    assert valid["subject"] == "google-provider-subject-1001"
    assert valid["email"] == "doctor@example.com"
    for changed in (
        {"aud": "attacker.apps.googleusercontent.com"},
        {"iss": "https://attacker.invalid"},
        {"exp": int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp())},
        {"email_verified": False},
        {"sub": ""},
    ):
        import pytest
        with pytest.raises(jwt.InvalidTokenError):
            verify_google_credential(token(**changed))
    monkeypatch.setattr(settings, "google_client_id", "")
    import pytest
    with pytest.raises(jwt.InvalidTokenError):
        verify_google_credential(token())


def test_google_signin_never_auto_links_existing_account_by_email(monkeypatch):
    enable_oauth(monkeypatch)
    synthetic_token = token()
    with TestClient(app) as client:
        access = register(client, "google-existing-one", "doctor@example.com")
        forbidden = client.post("/auth/google/token", json={"credential": synthetic_token})
        assert forbidden.status_code == 403
        linked = client.post("/auth/google/link", headers={"Authorization": "Bearer " + access},
                             json={"credential": synthetic_token})
        assert linked.status_code == 200, linked.text
        assert linked.json() == {"linked": True}
        login = client.post("/auth/google/token", json={"credential": synthetic_token})
        assert login.status_code == 200
        who = client.get("/auth/me", headers={
            "Authorization": "Bearer " + login.json()["access_token"]
        })
        assert who.status_code == 200
        assert who.json()["email"] == "doctor@example.com"

        changed_email = client.post("/auth/google/token", json={
            "credential": token(email="changed@example.com")
        })
        assert changed_email.status_code == 403


def test_google_link_rejects_mismatched_email_or_other_user_identity(monkeypatch):
    enable_oauth(monkeypatch)
    with TestClient(app) as client:
        alice = register(client, "google-link-a", "person-a@example.com")
        bob = register(client, "google-link-b", "person-b@example.com")
        assert client.post("/auth/google/link",
                           headers={"Authorization": "Bearer " + alice},
                           json={"credential": token(sub="google-provider-subject-1002", email="person-b@example.com")}).status_code == 403
        good = client.post("/auth/google/link", headers={"Authorization": "Bearer " + alice},
                           json={"credential": token(sub="google-provider-subject-1002", email="person-a@example.com")})
        assert good.status_code == 200, good.text
        taken = client.post("/auth/google/link", headers={"Authorization": "Bearer " + bob},
                            json={"credential": token(sub="google-provider-subject-1002", email="person-b@example.com")})
        assert taken.status_code == 409, taken.text
        assert client.post("/auth/google/link",
                           json={"credential": token(sub="google-provider-subject-1002", email="person-a@example.com")}).status_code == 401


def test_google_signup_disabled_until_enabled_and_separates_organizations(monkeypatch):
    enable_oauth(monkeypatch)
    with TestClient(app) as client:
        new = token(sub="new-google-person", email="new-google@example.com")
        assert client.post("/auth/google/token", json={"credential": new}).status_code == 403
        monkeypatch.setattr(settings, "google_self_signup_enabled", True)
        res = client.post("/auth/google/token", json={"credential": new})
        assert res.status_code == 200, res.text
        user = client.get("/auth/me", headers={
            "Authorization": "Bearer " + res.json()["access_token"]
        }).json()
        assert user["email"] == "new-google@example.com"
        assert user["role"] == "admin"
        assert user["organization_name"] == "Ambiente individual"
        assert client.post("/auth/google/token", json={"credential": new}).status_code == 200


def test_google_auth_is_disabled_if_backend_not_really_ready(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "sample-client.apps.googleusercontent.com")
    monkeypatch.setattr(type(settings), "professional_access_ready", property(lambda self: False))
    with TestClient(app) as client:
        assert client.post("/auth/google/token", json={"credential": CREDENTIAL}).status_code == 503
