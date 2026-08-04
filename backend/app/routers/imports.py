import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..audit import record
from ..deps import current_user, db_session
from ..models import Case, Conclusion, Evidence, Finding, Observation, User
from ..session_models import ImportedSnapshot

router = APIRouter(prefix="/cases", tags=["imports"])


def _case_payload(payload: dict) -> tuple[str, dict]:
    if "case" in payload and isinstance(payload["case"], dict):
        return str(payload.get("schema", "")), payload["case"]
    if "title" in payload:
        return "legacy-direct-case", payload
    raise HTTPException(422, "JSON não contém um caso reconhecível")


@router.post("/import", status_code=201)
def import_case(payload: dict, db: Session = Depends(db_session), user: User = Depends(current_user)):
    schema_name, source = _case_payload(payload)
    title = str(source.get("title") or "Caso importado").strip()
    object_type = str(source.get("objectType") or source.get("object_type") or "Não informado")
    case = Case(
        organization_id=user.organization_id,
        title=title,
        reference=str(source.get("reference") or ""),
        object_type=object_type,
        status=str(source.get("status") or "Importado"),
        scope=str(source.get("scope") or ""),
    )
    db.add(case)
    db.flush()

    db.add(ImportedSnapshot(
        organization_id=user.organization_id,
        case_id=case.id,
        source_schema=schema_name,
        payload=json.dumps(payload, ensure_ascii=False),
    ))

    evidence_map: dict[str, Evidence] = {}
    observation_map: dict[str, Observation] = {}
    finding_map: dict[str, Finding] = {}

    for item in source.get("evidence", []) or []:
        row = Evidence(
            case_id=case.id,
            type=str(item.get("type") or "Documento"),
            title=str(item.get("title") or "Sem título"),
            description=str(item.get("description") or ""),
            date=str(item.get("date") or ""),
            reliability=str(item.get("reliability") or "Não classificada"),
        )
        db.add(row)
        db.flush()
        evidence_map[str(item.get("id") or row.id)] = row

    for item in source.get("observations", []) or []:
        evidence = evidence_map.get(str(item.get("sourceId") or item.get("evidenceId") or ""))
        if not evidence:
            continue
        row = Observation(
            case_id=case.id,
            evidence_id=evidence.id,
            title=str(item.get("title") or "Observação"),
            text=str(item.get("text") or ""),
        )
        db.add(row)
        db.flush()
        observation_map[str(item.get("id") or row.id)] = row

    for item in source.get("findings", []) or []:
        linked_evidence = [evidence_map[key] for key in map(str, item.get("evidenceIds", []) or []) if key in evidence_map]
        linked_observations = [observation_map[key] for key in map(str, item.get("observationIds", []) or []) if key in observation_map]
        row = Finding(
            case_id=case.id,
            type=str(item.get("type") or "Achado"),
            title=str(item.get("title") or "Sem título"),
            description=str(item.get("description") or ""),
            confidence=str(item.get("confidence") or "Não classificada"),
            evidence=linked_evidence,
            observations=linked_observations,
        )
        db.add(row)
        db.flush()
        finding_map[str(item.get("id") or row.id)] = row

    imported_conclusions = 0
    skipped_conclusions = 0
    for item in source.get("conclusions", []) or []:
        linked_evidence = [evidence_map[key] for key in map(str, item.get("evidenceIds", []) or []) if key in evidence_map]
        linked_findings = [finding_map[key] for key in map(str, item.get("findingIds", []) or []) if key in finding_map]
        if not linked_evidence:
            skipped_conclusions += 1
            continue
        row = Conclusion(
            case_id=case.id,
            title=str(item.get("title") or "Conclusão"),
            text=str(item.get("text") or ""),
            status=str(item.get("status") or "Preliminar"),
            evidence=linked_evidence,
            findings=linked_findings,
        )
        db.add(row)
        imported_conclusions += 1

    record(db, user, "import", "case", case.id, {
        "schema": schema_name,
        "evidence": len(evidence_map),
        "observations": len(observation_map),
        "findings": len(finding_map),
        "conclusions": imported_conclusions,
        "skippedConclusionsWithoutEvidence": skipped_conclusions,
    })
    db.commit()
    return {
        "id": case.id,
        "imported": {
            "evidence": len(evidence_map),
            "observations": len(observation_map),
            "findings": len(finding_map),
            "conclusions": imported_conclusions,
        },
        "skippedConclusionsWithoutEvidence": skipped_conclusions,
        "rawSnapshotPreserved": True,
    }
