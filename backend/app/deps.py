from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import User
from .security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def current_user(token: str = Depends(oauth2), db: Session = Depends(db_session)) -> User:
    try:
        payload = decode_token(token)
    except Exception as exc:
        raise HTTPException(401, "Token inválido") from exc
    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active or user.organization_id != payload.get("org"):
        raise HTTPException(401, "Usuário inválido")
    return user
