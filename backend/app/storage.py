import hashlib
import os
import uuid
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, UploadFile

from .config import settings

# Formatos aceitos, decididos pelo CONTEÚDO e não pelo cabeçalho.
#
# `UploadFile.content_type` é o que o cliente declara no multipart — navegador,
# curl ou script. Recusar "image/jpeg" por ele seria teatro: bastaria declarar
# "application/pdf" e a fotografia entraria assim mesmo.
#
# A lista é POSITIVA e por assinatura de bytes. Um formato de imagem que ninguém
# listou — HEIC, AVIF, TIFF, o próximo que a Apple inventar — é recusado por não
# constar, em vez de aceito por não ter sido lembrado. Lista de proibidos
# envelhece; lista de permitidos não.
#
# Fotografia do periciado está FORA do piloto por decisão de produto
# (`docs/DATA_HANDLING_PILOT.md` §1). O bloqueio é do sistema, não da disciplina
# de quem usa. Documento digitalizado que chegar como imagem precisa ser
# convertido em PDF antes de subir — é o custo de a garantia ser real.
_PDF_MAGIC = b"%PDF-"

# Assinaturas de formatos que NÃO entram. Servem para dar mensagem específica
# ("é imagem") em vez de um 415 genérico que a perita não saberia interpretar.
_IMAGE_SIGNATURES = (
    (b"\xff\xd8\xff", "JPEG"),
    (b"\x89PNG\r\n\x1a\n", "PNG"),
    (b"GIF87a", "GIF"),
    (b"GIF89a", "GIF"),
    (b"II*\x00", "TIFF"),
    (b"MM\x00*", "TIFF"),
    (b"BM", "BMP"),
)


def _detect_type(raw: bytes) -> str:
    """Tipo real do arquivo, lido dos bytes. Levanta 415 no que não é aceito."""
    if raw.startswith(_PDF_MAGIC):
        return "application/pdf"

    for assinatura, rotulo in _IMAGE_SIGNATURES:
        if raw.startswith(assinatura):
            raise HTTPException(
                415,
                f"Arquivo de imagem ({rotulo}) não é aceito nesta fase. "
                "Documento digitalizado deve ser convertido em PDF antes de anexar.",
            )
    # RIFF....WEBP — a assinatura não é contígua.
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        raise HTTPException(
            415,
            "Arquivo de imagem (WebP) não é aceito nesta fase. "
            "Documento digitalizado deve ser convertido em PDF antes de anexar.",
        )

    # Texto precisa parecer texto, não apenas decodificar. Byte nulo é UTF-8
    # válido, então `decode` sozinho aceitava binário: um HEIC cujo cabeçalho
    # decodificasse limpo era gravado como "text/plain" e a fotografia entrava
    # pela porta dos fundos. Encontrado pelo teste da lista positiva.
    if b"\x00" in raw:
        raise HTTPException(
            415,
            "Formato não reconhecido. Nesta fase são aceitos PDF e texto.",
        )
    try:
        texto = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            415,
            "Formato não reconhecido. Nesta fase são aceitos PDF e texto.",
        ) from None
    # Controles fora de tabulação, nova linha e retorno indicam binário.
    if any(ord(c) < 32 and c not in "\t\n\r" for c in texto[:4096]):
        raise HTTPException(
            415,
            "Formato não reconhecido. Nesta fase são aceitos PDF e texto.",
        )
    return "text/plain"


def _cipher() -> Fernet:
    if not settings.file_encryption_key:
        raise RuntimeError("MEDPER_FILE_ENCRYPTION_KEY não configurada")
    return Fernet(settings.file_encryption_key.encode("ascii"))


def storage_root() -> Path:
    root = Path(settings.storage_path).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


async def save_upload(upload: UploadFile) -> dict:
    # O tipo é decidido depois de ler, a partir dos bytes. O cabeçalho declarado
    # pelo cliente não é consultado em momento nenhum — se fosse, o bloqueio de
    # imagem cairia com uma declaração falsa.
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
    if not raw:
        raise HTTPException(400, "Arquivo vazio")
    content_type = _detect_type(raw)
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
