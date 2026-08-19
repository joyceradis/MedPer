from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..audit import record
from ..config import settings
from ..deps import current_user, db_session, set_request_context
from ..mailer import send_password_reset
from ..models import Organization, User
from ..rate_limit import enforce_auth_rate_limit
from ..schemas import MeOut, RegisterIn
from ..security import create_access_token, hash_password, opaque_token, token_digest, verify_password
from ..session_models import PasswordResetToken, RefreshSession

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=12)


def utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def issue_pair(db: Session, user: User, request: Request, family_id: str | None = None) -> TokenPair:
    raw, session = RefreshSession.issue(user.id, user.organization_id, settings.refresh_token_days, family_id)
    session.user_agent = request.headers.get("user-agent", "")[:300]
    session.ip_address = request.client.host if request.client else ""
    db.add(session)
    db.flush()
    return TokenPair(access_token=create_access_token(user.id, user.organization_id), refresh_token=raw)


@router.post("/register", response_model=TokenPair, status_code=201)
def register(data: RegisterIn, request: Request, db: Session = Depends(db_session)):
    if db.scalar(select(Organization).where(Organization.slug == data.organization_slug)):
        raise HTTPException(409, "Organização já existe")
    org = Organization(name=data.organization_name, slug=data.organization_slug)
    db.add(org)
    db.flush()
    user = User(organization_id=org.id, email=str(data.email).lower(), full_name=str(data.full_name or "").strip() or None, password_hash=hash_password(data.password), role="admin")
    db.add(user)
    db.flush()
    set_request_context(db, user)
    pair = issue_pair(db, user, request)
    record(db, user, "create", "organization", org.id)
    db.commit()
    return pair


@router.post("/token", response_model=TokenPair)
def token(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(db_session)):
    enforce_auth_rate_limit(request, "token")
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not user.is_active or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Credenciais inválidas")
    pair = issue_pair(db, user, request)
    db.commit()
    return pair


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshIn, request: Request, db: Session = Depends(db_session)):
    enforce_auth_rate_limit(request, "refresh")
    digest = token_digest(data.refresh_token)
    row = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == digest))
    now = datetime.now(timezone.utc)
    if not row or row.revoked_at or utc(row.expires_at) <= now:
        if row:
            db.execute(update(RefreshSession).where(RefreshSession.family_id == row.family_id).values(revoked_at=now))
            db.commit()
        raise HTTPException(401, "Sessão inválida ou reutilizada")

    claimed = db.execute(
        update(RefreshSession)
        .where(RefreshSession.id == row.id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    if claimed.rowcount != 1:
        db.execute(update(RefreshSession).where(RefreshSession.family_id == row.family_id).values(revoked_at=now))
        db.commit()
        raise HTTPException(401, "Sessão inválida ou reutilizada")

    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        db.rollback()
        raise HTTPException(401, "Usuário inválido")
    pair = issue_pair(db, user, request, row.family_id)
    replacement = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_digest(pair.refresh_token)))
    row.replaced_by_id = replacement.id if replacement else None
    set_request_context(db, user)
    record(db, user, "rotate", "refresh_session", row.id)
    db.commit()
    return pair


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(db_session), user: User = Depends(current_user)):
    """Identidade da sessão corrente.

    Existe porque a interface não tinha de onde ler quem está logada e caía num
    nome fixo no código — o que, num piloto com várias peritas, mostrava a
    identidade de outra pessoa a todas elas.
    """
    org = db.get(Organization, user.organization_id)
    return MeOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role,
        organization_name=org.name if org else "",
    )


@router.post("/logout", status_code=204)
def logout(data: RefreshIn, db: Session = Depends(db_session)):
    row = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_digest(data.refresh_token)))
    if row and not row.revoked_at:
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()


@router.post("/logout-all", status_code=204)
def logout_all(db: Session = Depends(db_session), user: User = Depends(current_user)):
    db.execute(update(RefreshSession).where(RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None)).values(revoked_at=datetime.now(timezone.utc)))
    record(db, user, "revoke_all", "refresh_session", user.id)
    db.commit()


@router.post("/forgot-password")
def forgot_password(data: ForgotIn, request: Request, background: BackgroundTasks, db: Session = Depends(db_session)):
    enforce_auth_rate_limit(request, "forgot-password")
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if user:
        raw = opaque_token()
        db.add(PasswordResetToken(
            organization_id=user.organization_id,
            user_id=user.id,
            token_hash=token_digest(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_minutes),
        ))
        db.commit()
        if settings.smtp_enabled:
            background.add_task(send_password_reset, user.email, raw)
        elif settings.public_api_url.startswith("http://localhost"):
            return {"message": "Solicitação registrada", "development_token": raw}
    return {"message": "Se a conta existir, as instruções serão enviadas."}


@router.post("/reset-password")
def reset_password(data: ResetIn, db: Session = Depends(db_session)):
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_digest(data.token)))
    now = datetime.now(timezone.utc)
    if not row or row.consumed_at or utc(row.expires_at) <= now:
        raise HTTPException(400, "Token inválido ou expirado")
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(400, "Token inválido")
    user.password_hash = hash_password(data.new_password)
    row.consumed_at = now
    db.execute(update(RefreshSession).where(RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None)).values(revoked_at=now))
    set_request_context(db, user)
    record(db, user, "password_reset", "user", user.id)
    db.commit()
    return {"message": "Senha alterada e sessões revogadas"}
