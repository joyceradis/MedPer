import json
from sqlalchemy.orm import Session
from .models import AuditLog, User

def record(db: Session, user: User, action: str, entity_type: str, entity_id: str, payload: dict | None = None):
    db.add(AuditLog(
        organization_id=user.organization_id,
        user_id=user.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=json.dumps(payload or {}, ensure_ascii=False),
    ))
