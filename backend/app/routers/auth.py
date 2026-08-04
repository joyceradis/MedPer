from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..audit import record
from ..deps import db_session
from ..models import Organization, User
from ..schemas import RegisterIn, TokenOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(db_session)):
    if db.scalar(select(Organization).where(Organization.slug == data.organization_slug)):
        raise HTTPException(409, "Organização já existe")
    org = Organization(name=data.organization_name, slug=data.organization_slug)
    db.add(org)
    db.flush()
    user = User(organization_id=org.id, email=str(data.email).lower(), password_hash=hash_password(data.password), role="admin")
    db.add(user)
    db.flush()
    record(db, user, "create", "organization", org.id)
    db.commit()
    return TokenOut(access_token=create_token(user.id, org.id))

@router.post("/token", response_model=TokenOut)
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Credenciais inválidas")
    return TokenOut(access_token=create_token(user.id, user.organization_id))
