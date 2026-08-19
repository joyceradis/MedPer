"""Cifragem em repouso do conteúdo da perícia.

O sistema já cifrava os anexos (`storage.py`, Fernet) mas gravava o estado do
caso — `cases.state_payload` — como JSON em claro. É justamente ali que vive o
dado mais sensível: história do periciado, exame, achados, discussão e
conclusão. Anexo cifrado com laudo em claro é proteção pela metade.

Compatibilidade é requisito, não conveniência: bases existentes já têm linhas
em claro. A leitura aceita as duas formas e a escrita sempre cifra, de modo que
a base migra sozinha conforme os casos são salvos, sem janela de indisponibilidade
e sem script de migração que precise ler dado sensível para reescrevê-lo.

Sem chave configurada o comportamento é explícito: em ambiente que exige
armazenamento (`file_storage_required`) a ausência de chave é erro; fora dele o
payload é gravado em claro, como antes, para não quebrar desenvolvimento local.
"""

from __future__ import annotations

import json

from cryptography.fernet import Fernet, InvalidToken

from .config import settings

# Marcador da forma cifrada. Um payload de caso é sempre um objeto JSON, então
# esta chave não colide com conteúdo legítimo do estado do caso.
ENVELOPE_KEY = "__medper_encrypted__"
ENVELOPE_VERSION = 1


def encryption_available() -> bool:
    return bool(settings.file_encryption_key) and settings.file_encryption_key_is_valid


def _cipher() -> Fernet:
    return Fernet(settings.file_encryption_key.encode("ascii"))


def encrypt_payload(payload: dict | None) -> dict:
    """Devolve o que deve ser gravado na coluna."""
    data = payload or {}
    if not encryption_available():
        if getattr(settings, "file_storage_required", False):
            raise RuntimeError(
                "MEDPER_FILE_ENCRYPTION_KEY ausente ou inválida: o conteúdo da perícia "
                "não pode ser gravado em claro neste ambiente."
            )
        return data
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return {
        ENVELOPE_KEY: ENVELOPE_VERSION,
        "ciphertext": _cipher().encrypt(raw).decode("ascii"),
    }


def decrypt_payload(stored: dict | None) -> dict:
    """Lê tanto o envelope cifrado quanto a linha antiga em claro."""
    if not stored:
        return {}
    if not isinstance(stored, dict) or ENVELOPE_KEY not in stored:
        # Linha gravada antes desta mudança. Continua legível; será cifrada na
        # próxima escrita.
        return stored
    if not encryption_available():
        raise RuntimeError(
            "Este caso está cifrado e a chave de decifragem não está configurada. "
            "Restaure MEDPER_FILE_ENCRYPTION_KEY — sem ela o conteúdo é irrecuperável."
        )
    try:
        raw = _cipher().decrypt(str(stored.get("ciphertext", "")).encode("ascii"))
    except InvalidToken as error:
        raise RuntimeError(
            "Falha ao decifrar o conteúdo da perícia: a chave configurada não é a "
            "que cifrou este caso."
        ) from error
    return json.loads(raw.decode("utf-8"))


def is_encrypted(stored: dict | None) -> bool:
    return isinstance(stored, dict) and ENVELOPE_KEY in stored
