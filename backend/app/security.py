import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from .config import settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(user_id: str, organization_id: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": user_id,
        "org": organization_id,
        "type": "access",
        "iat": now,
        "exp": exp,
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Tipo de token inválido")
    return payload


def opaque_token() -> str:
    return secrets.token_urlsafe(48)


def token_digest(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# Aliases temporários para compatibilidade com a fase 1.
create_token = create_access_token
decode_token = decode_access_token
