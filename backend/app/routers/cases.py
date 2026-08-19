from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ..audit import record
from ..deps import current_user, db_session
from ..models import Case, Evidence, Observation, Finding, Conclusion, User
from ..schemas import CaseIn, CaseStateIn, EvidenceIn, ObservationIn, FindingIn, ConclusionIn

router = APIRouter(prefix="/cases", tags=["cases"])

def owned_case(db: Session, user: User, case_id: str) -> Case:
    case = db.scalar(select(Case).where(Case.id == case_id, Case.organization_id == user.organization_id))
    if not case:
        raise HTTPException(404, "Caso não encontrado")
    return case

@router.post("", status_code=201)
def create_case(data: CaseIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    case = Case(organization_id=user.organization_id, title=data.title, reference=data.reference, object_type=data.objectType, status=data.status, scope=data.scope)
    db.add(case)
    db.flush()
    record(db, user, "create", "case", case.id)
    db.commit()
    return {"id": case.id}

@router.get("")
def list_cases(db: Session = Depends(db_session), user: User = Depends(current_user)):
    rows = db.scalars(select(Case).where(Case.organization_id == user.organization_id)).all()
    return [{"id": c.id, "title": c.title, "reference": c.reference, "objectType": c.object_type} for c in rows]

@router.get("/{case_id}/state")
def get_case_state(case_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    case = owned_case(db, user, case_id)
    return {
        "payload": case.state_payload or {},
        "revision": case.state_revision or 0,
        "updatedAt": case.state_updated_at.isoformat() if case.state_updated_at else None,
    }

@router.put("/{case_id}/state")
def put_case_state(case_id: str, data: CaseStateIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    updated_at = datetime.now(timezone.utc)
    result = db.execute(
        update(Case)
        .where(
            Case.id == case_id,
            Case.organization_id == user.organization_id,
            Case.state_revision == data.expectedRevision,
        )
        .values(
            state_payload=data.payload,
            state_revision=Case.state_revision + 1,
            state_updated_at=updated_at,
        )
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "O caso foi atualizado em outra sessão; recarregue antes de salvar novamente")
    case = owned_case(db, user, case_id)
    record(db, user, "update_state", "case", case.id, {"revision": case.state_revision})
    db.commit()
    return {"revision": case.state_revision, "updatedAt": updated_at.isoformat()}

@router.post("/{case_id}/evidence", status_code=201)
def add_evidence(case_id: str, data: EvidenceIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    evidence = Evidence(case_id=case_id, **data.model_dump())
    db.add(evidence)
    db.flush()
    record(db, user, "create", "evidence", evidence.id)
    db.commit()
    return {"id": evidence.id}

@router.post("/{case_id}/observations", status_code=201)
def add_observation(case_id: str, data: ObservationIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    evidence = db.scalar(select(Evidence).where(Evidence.id == data.evidenceId, Evidence.case_id == case_id))
    if not evidence:
        raise HTTPException(422, "Evidência não pertence ao caso")
    observation = Observation(case_id=case_id, evidence_id=evidence.id, title=data.title, text=data.text)
    db.add(observation)
    db.flush()
    record(db, user, "create", "observation", observation.id)
    db.commit()
    return {"id": observation.id}

@router.post("/{case_id}/findings", status_code=201)
def add_finding(case_id: str, data: FindingIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    evidence = db.scalars(select(Evidence).where(Evidence.case_id == case_id, Evidence.id.in_(data.evidenceIds))).all() if data.evidenceIds else []
    observations = db.scalars(select(Observation).where(Observation.case_id == case_id, Observation.id.in_(data.observationIds))).all() if data.observationIds else []
    if len(evidence) != len(set(data.evidenceIds)) or len(observations) != len(set(data.observationIds)):
        raise HTTPException(422, "Referência externa ao caso")
    finding = Finding(case_id=case_id, type=data.type, title=data.title, description=data.description, confidence=data.confidence, evidence=evidence, observations=observations)
    db.add(finding)
    db.flush()
    record(db, user, "create", "finding", finding.id)
    db.commit()
    return {"id": finding.id}

@router.post("/{case_id}/conclusions", status_code=201)
def add_conclusion(case_id: str, data: ConclusionIn, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    evidence = db.scalars(select(Evidence).where(Evidence.case_id == case_id, Evidence.id.in_(data.evidenceIds))).all()
    findings = db.scalars(select(Finding).where(Finding.case_id == case_id, Finding.id.in_(data.findingIds))).all() if data.findingIds else []
    if len(evidence) != len(set(data.evidenceIds)) or len(findings) != len(set(data.findingIds)):
        raise HTTPException(422, "Evidência ou achado não pertence ao caso")
    conclusion = Conclusion(case_id=case_id, title=data.title, text=data.text, status=data.status, evidence=evidence, findings=findings)
    db.add(conclusion)
    db.flush()
    record(db, user, "create", "conclusion", conclusion.id)
    db.commit()
    return {"id": conclusion.id}
