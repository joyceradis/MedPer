from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import record
from ..config import settings
from ..deps import current_user, db_session
from ..models import User
from ..session_models import StoredFile
from ..storage import read_file, save_upload
from .cases import owned_case

router = APIRouter(prefix="/cases", tags=["files"])


def require_file_storage_ready() -> None:
    if not settings.file_encryption_key_is_valid:
        raise HTTPException(503, "Armazenamento de arquivos indisponível: criptografia não configurada")


@router.post("/{case_id}/files", status_code=201)
async def upload_case_file(
    case_id: str,
    upload: UploadFile = File(...),
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_file_storage_ready()
    owned_case(db, user, case_id)
    saved = await save_upload(upload)
    row = StoredFile(
        organization_id=user.organization_id,
        case_id=case_id,
        uploaded_by=user.id,
        original_name=(upload.filename or "arquivo")[:255],
        storage_key=saved["storage_key"],
        content_type=saved["content_type"],
        size_bytes=saved["size_bytes"],
        sha256=saved["sha256"],
        encrypted=True,
    )
    db.add(row)
    db.flush()
    record(db, user, "create", "stored_file", row.id, {"sha256": row.sha256, "size": row.size_bytes})
    db.commit()
    return {
        "id": row.id,
        "name": row.original_name,
        "contentType": row.content_type,
        "size": row.size_bytes,
        "sha256": row.sha256,
        "encrypted": row.encrypted,
    }


@router.get("/{case_id}/files")
def list_case_files(case_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    owned_case(db, user, case_id)
    rows = db.scalars(select(StoredFile).where(
        StoredFile.case_id == case_id,
        StoredFile.organization_id == user.organization_id,
    )).all()
    return [{
        "id": row.id,
        "name": row.original_name,
        "contentType": row.content_type,
        "size": row.size_bytes,
        "sha256": row.sha256,
        "createdAt": row.created_at.isoformat(),
    } for row in rows]


@router.get("/{case_id}/files/{file_id}")
def download_case_file(case_id: str, file_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    require_file_storage_ready()
    owned_case(db, user, case_id)
    row = db.scalar(select(StoredFile).where(
        StoredFile.id == file_id,
        StoredFile.case_id == case_id,
        StoredFile.organization_id == user.organization_id,
    ))
    if not row:
        raise HTTPException(404, "Arquivo não encontrado")
    data = read_file(row.storage_key)
    return StreamingResponse(
        BytesIO(data),
        media_type=row.content_type,
        headers={"Content-Disposition": f'attachment; filename="{row.original_name}"'},
    )
