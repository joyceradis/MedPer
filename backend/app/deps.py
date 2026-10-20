from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User
from .security import decode_access_token


oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")


def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_request_context(db: Session, user: User) -> None:
    if db.bind and db.bind.dialect.name == "postgresql":
        db.execute(text("select set_config('app.organization_id', :org, true)"), {"org": user.organization_id})
        db.execute(text("select set_config('app.user_id', :usr, true)"), {"usr": user.id})


def current_user(token: str = Depends(oauth2), db: Session = Depends(db_session)) -> User:
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(401, "Token inválido") from exc
    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active or user.organization_id != payload.get("org"):
        raise HTTPException(401, "Usuário inválido")
    set_request_context(db, user)
    return user


def require_single_practitioner_case_scope(
    db: Session = Depends(db_session), user: User = Depends(current_user)
) -> None:
    """Fail closed when organization-level authorization is insufficient.

    V2 currently does NOT grant case-specific rights. A shared organization
    must not automatically expose every case to a second account. This gate
    blocks all case/file/import endpoints if the organization has ever had
    another user account, even if that account was later deactivated.
    It deliberately does NOT grant team collaboration. That requires a
    versioned case-owner/grant model, migration and separately tested RLS.
    """
    users = db.scalar(
        select(func.count(User.id)).where(User.organization_id == user.organization_id)
    )
    if users != 1:
        raise HTTPException(
            403,
            "Acesso por equipe ainda bloqueado: autorizações individuais por caso pendentes."
        )
