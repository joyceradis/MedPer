from fastapi import Depends, HTTPException
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


def current_user(token: str = Depends(oauth2), db: Session = Depends(db_session)) -> User:
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(401, "Token inválido") from exc
    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active or user.organization_id != payload.get("org"):
        raise HTTPException(401, "Usuário inválido")
    if db.bind and db.bind.dialect.name == "postgresql":
        db.execute(text("select set_config('app.organization_id', :org, true)"), {"org": user.organization_id})
        db.execute(text("select set_config('app.user_id', :usr, true)"), {"usr": user.id})
    return user
