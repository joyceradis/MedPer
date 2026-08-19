import hashlib
import os
import uuid
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, UploadFile

from .config import settings

_ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "application/json",
}


def _cipher() -> Fernet:
    if not settings.file_encryption_key:
        raise RuntimeError("MEDPER_FILE_ENCRYPTION_KEY não configurada")
    return Fernet(settings.file_encryption_key.encode("ascii"))


def storage_root() -> Path:
    root = Path(settings.storage_path).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


async def save_upload(upload: UploadFile) -> dict:
    content_type = upload.content_type or "application/octet-stream"
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(415, "Tipo de arquivo não permitido")

    chunks: list[bytes] = []
    total = 0
    digest = hashlib.sha256()
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.max_upload_bytes:
            raise HTTPException(413, "Arquivo excede o limite configurado")
        digest.update(chunk)
        chunks.append(chunk)

    raw = b"".join(chunks)
    encrypted = _cipher().encrypt(raw)
    key = f"{uuid.uuid4().hex}.bin"
    target = storage_root() / key
    target.write_bytes(encrypted)
    os.chmod(target, 0o600)
    return {
        "storage_key": key,
        "size_bytes": total,
        "sha256": digest.hexdigest(),
        "content_type": content_type,
    }


def read_file(storage_key: str) -> bytes:
    path = storage_root() / Path(storage_key).name
    if not path.exists():
        raise HTTPException(404, "Arquivo não encontrado")
    try:
        return _cipher().decrypt(path.read_bytes())
    except InvalidToken as exc:
        raise HTTPException(500, "Falha de integridade do arquivo") from exc


def delete_file(storage_key: str) -> bool:
    """Remove o arquivo do disco.

    O cascade do banco apaga a linha de `stored_files` mas deixaria o blob
    cifrado no disco indefinidamente — o que transforma "excluir a perícia" numa
    promessa que o sistema não cumpre. Devolve True se havia arquivo.
    """
    path = storage_root() / storage_key
    try:
        path.unlink()
        return True
    except FileNotFoundError:
        return False
