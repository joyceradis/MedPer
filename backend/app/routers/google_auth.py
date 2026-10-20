"""Federated Google login for existing/explicitly enabled professional accounts.

No implicit email-only account linking. No chargeable external identity
platform, secret or automatic rollout. Uses MedPer's existing JWT sessions.
"""
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from jwt import InvalidTokenError, PyJWTError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..audit import record
from ..config import settings
from ..deps import current_user, db_session, set_request_context
from ..google_identity import verify_google_credential
from ..models import Organization, User
from ..rate_limit import enforce_auth_rate_limit
from ..security import hash_password
from .auth import TokenPair, issue_pair

router = APIRouter(prefix="/auth/google", tags=["auth"])


class GoogleCredentialIn(BaseModel):
    credential: str = Field(min_length=20, max_length=8192)


def verified_google_identity(request: Request, credential: str) -> dict:
    enforce_auth_rate_limit(request, "google-sign-in")
    if not settings.professional_access_ready or not settings.google_client_id:
        raise HTTPException(503, "Acesso Google não habilitado no servidor")
    try:
        return verify_google_credential(credential)
    except (InvalidTokenError, PyJWTError, ValueError):
        raise HTTPException(401, "Credencial Google inválida") from None
    except Exception:
        # Unexpected JWKS/network failure: fail closed, never fall back to email.
        raise HTTPException(503, "Não foi possível validar o acesso Google") from None


@router.post("/token", response_model=TokenPair)
def google_token(data: GoogleCredentialIn, request: Request, db: Session = Depends(db_session)):
    claims = verified_google_identity(request, data.credential)
    accounts = db.scalars(select(User).where(User.google_subject == claims["subject"])).all()
    if len(accounts) > 1:
        raise HTTPException(403, "Identidade Google duplicada; acesso bloqueado")
    user = accounts[0] if accounts else None
    if user and (not user.is_active or user.email.lower() != claims["email"]):
        # Email changed from linked value: require an explicit account review.
        raise HTTPException(403, "Conta Google indisponível; solicite revisão do vínculo")

    if not user:
        # NEVER take over an existing password account based solely on email.
        if db.scalar(select(User.id).where(User.email == claims["email"])):
            raise HTTPException(403, "Esta conta precisa de vínculo autenticado antes de usar Google")
        if not settings.google_self_signup_enabled:
            raise HTTPException(403, "Acesso por Google disponível somente para contas autorizadas")
        slug = "google-" + hashlib.sha256(claims["subject"].encode()).hexdigest()[:24]
        org = Organization(name="Ambiente individual", slug=slug)
        db.add(org)
        db.flush()
        # No password is sent or stored in browser during Google signup.
        user = User(
            organization_id=org.id, email=claims["email"],
            full_name=claims["name"] or None,
            password_hash=hash_password(secrets.token_urlsafe(48)),
            google_subject=claims["subject"], role="admin",
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Conta existente ou conflito de identidade; revise o cadastro") from None

    set_request_context(db, user)
    pair = issue_pair(db, user, request)
    record(db, user, "login_google", "user", user.id)
    db.commit()
    return pair


@router.post("/link")
def link_google_identity(
    data: GoogleCredentialIn, request: Request,
    db: Session = Depends(db_session), user: User = Depends(current_user)
):
    """Explicitly link Google only from an already authenticated MedPer account."""
    claims = verified_google_identity(request, data.credential)
    if not user.is_active or claims["email"] != user.email.lower():
        raise HTTPException(403, "Identidade Google não corresponde à conta autenticada")
    if user.google_subject and user.google_subject != claims["subject"]:
        raise HTTPException(409, "Esta conta já está vinculada a outra identidade Google")
    assigned = db.scalar(select(User.id).where(
        User.google_subject == claims["subject"], User.id != user.id
    ))
    if assigned:
        raise HTTPException(409, "Identidade Google já vinculada")
    user.google_subject = claims["subject"]
    set_request_context(db, user)
    record(db, user, "link_google", "user", user.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Conflito de vínculo Google") from None
    return {"linked": True}
