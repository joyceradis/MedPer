"""Google Identity Services verifier: accept only Google-signed ID tokens.

Do not use emails, profile names, browser IDs or ID token payloads without
signature, exact audience and issuer verification. Google 'sub' is the identity.
"""
from functools import lru_cache

import jwt
from jwt import InvalidTokenError, PyJWKClient
from pydantic import EmailStr, TypeAdapter, ValidationError

from .config import settings

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
_email_validator = TypeAdapter(EmailStr)


@lru_cache(maxsize=1)
def signing_keys() -> PyJWKClient:
    return PyJWKClient(GOOGLE_JWKS_URL, cache_jwk_set=True, lifespan=3600, timeout=5)


def verify_google_credential(credential: str) -> dict:
    """Raise InvalidTokenError on ANY invalid or unverified Google assertion."""
    client_id = settings.google_client_id.strip()
    if not client_id:
        raise InvalidTokenError("Google login disabled")
    if not isinstance(credential, str) or not 20 <= len(credential) <= 8192:
        raise InvalidTokenError("Malformed Google ID token")
    try:
        key = signing_keys().get_signing_key_from_jwt(credential).key
        payload = jwt.decode(
            credential, key, algorithms=["RS256"], audience=client_id,
            issuer=GOOGLE_ISSUERS,
            options={"require": ["sub", "iss", "aud", "exp", "iat"]},
            leeway=30,
        )
        subject = payload.get("sub")
        if not isinstance(subject, str) or not 1 <= len(subject) <= 255:
            raise InvalidTokenError("Invalid Google subject")
        if payload.get("email_verified") is not True:
            raise InvalidTokenError("Unverified Google email")
        email = str(_email_validator.validate_python(payload.get("email", ""))).lower()
        if len(email) > 254:
            raise InvalidTokenError("Invalid email")
        name = payload.get("name")
        return {"subject": subject, "email": email,
                "name": str(name)[:160] if isinstance(name, str) else ""}
    except (InvalidTokenError, ValidationError, ValueError, TypeError, KeyError) as exc:
        raise InvalidTokenError("Invalid Google ID token") from exc
