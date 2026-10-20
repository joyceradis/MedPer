from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import SessionLocal
from .config import settings
from .models import User
from .security import decode_access_token


oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")


def require_api_access() -> None:
    if not settings.api_routes_enabled:
        raise HTTPException(503, "Acesso profissional indisponível.", headers={"Cache-Control": "no-store"})


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
