import io

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import Case
from app.session_models import StoredFile
from app.storage import storage_root

client = TestClient(app)

SENHA = "correct-horse-battery"

PDF = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n"
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 48
TIFF = b"II*\x00" + b"\x00" * 64
TEXTO = "Prontuário — evolução de 12/03.\nAlta em 20/03.".encode("utf-8")


def _conta(slug: str) -> dict:
    resposta = client.post('/auth/register', json={
        "organization_name": slug, "organization_slug": slug,
        "full_name": "Perita de Teste", "email": f"{slug}@exemplo.br",
        "password": SENHA,
    })
    assert resposta.status_code == 201, resposta.text
    return {"Authorization": "Bearer " + resposta.json()["access_token"]}


def _caso(headers: dict) -> str:
    return client.post('/cases', headers=headers, json={
        "title": "Caso", "objectType": "Dano corporal"
    }).json()['id']


def _subir(headers, case_id, conteudo: bytes, nome: str, declarado: str):
    return client.post(
        f'/cases/{case_id}/files', headers=headers,
        files={"upload": (nome, io.BytesIO(conteudo), declarado)},
    )


# ------------------------------------------------------- o que entra

def test_a_pdf_from_the_case_file_is_accepted_and_stored_encrypted():
    headers = _conta("upload-pdf")
    case_id = _caso(headers)

    resposta = _subir(headers, case_id, PDF, "prontuario.pdf", "application/pdf")
    assert resposta.status_code == 201, resposta.text

    with SessionLocal() as db:
        linha = db.scalar(select(StoredFile).where(StoredFile.case_id == case_id))
    assert linha.content_type == "application/pdf"
    assert linha.encrypted is True

    # O que está no disco não é o PDF: é o envelope cifrado.
    bruto = (storage_root() / linha.storage_key).read_bytes()
    assert not bruto.startswith(b"%PDF"), "o arquivo não pode ficar em claro no disco"

    # E a leitura pela rota devolve o original.
    baixado = client.get(f'/cases/{case_id}/files/{linha.id}', headers=headers)
    assert baixado.status_code == 200
    assert baixado.content == PDF


def test_plain_text_is_accepted():
    headers = _conta("upload-txt")
    case_id = _caso(headers)
    resposta = _subir(headers, case_id, TEXTO, "notas.txt", "text/plain")
    assert resposta.status_code == 201, resposta.text


# ------------------------------------------------------- o que não entra
#
# Fotografia do periciado está fora do piloto por decisão de produto. O bloqueio
# tem de ser do sistema; confiar em disciplina não é bloqueio.

def test_images_are_refused_with_a_message_that_says_what_to_do():
    headers = _conta("upload-img")
    case_id = _caso(headers)

    for conteudo, nome, rotulo in (
        (JPEG, "lesao.jpg", "JPEG"),
        (PNG, "cicatriz.png", "PNG"),
        (WEBP, "foto.webp", "WebP"),
        (TIFF, "digitalizado.tif", "TIFF"),
    ):
        resposta = _subir(headers, case_id, conteudo, nome, "image/jpeg")
        assert resposta.status_code == 415, f"{rotulo} precisa ser recusado"
        detalhe = resposta.json()["detail"]
        assert rotulo in detalhe, f"a mensagem diz qual formato: {detalhe}"
        assert "PDF" in detalhe, "a mensagem diz o que fazer no lugar"


def test_a_photograph_declared_as_pdf_is_still_refused():
    """O ponto inteiro da mudança.

    `content_type` vem do cliente. Enquanto a validação olhava o cabeçalho,
    bastava declarar "application/pdf" para uma fotografia de lesão entrar. Agora
    a decisão é dos bytes, e a declaração não é consultada.
    """
    headers = _conta("upload-mentira")
    case_id = _caso(headers)

    resposta = _subir(headers, case_id, JPEG, "prontuario.pdf", "application/pdf")
    assert resposta.status_code == 415, "declarar PDF não faz de uma imagem um PDF"
    assert "JPEG" in resposta.json()["detail"]

    with SessionLocal() as db:
        assert db.scalars(select(StoredFile).where(StoredFile.case_id == case_id)).all() == []


def test_an_unknown_binary_format_is_refused_rather_than_accepted_by_omission():
    """Lista positiva: o que não é reconhecido não entra.

    Uma lista de formatos PROIBIDOS envelheceria — HEIC, AVIF e o próximo que
    aparecer entrariam por não constar dela.
    """
    headers = _conta("upload-desconhecido")
    case_id = _caso(headers)
    heic = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 64

    resposta = _subir(headers, case_id, heic, "foto.heic", "image/heic")
    assert resposta.status_code == 415
    assert "PDF" in resposta.json()["detail"]


def test_an_empty_file_is_refused():
    headers = _conta("upload-vazio")
    case_id = _caso(headers)
    assert _subir(headers, case_id, b"", "vazio.pdf", "application/pdf").status_code == 400


# ------------------------------------------------------- isolamento

def test_a_file_cannot_be_listed_or_downloaded_from_another_organization():
    dona = _conta("upload-dona")
    intrusa = _conta("upload-intrusa")
    case_id = _caso(dona)
    enviado = _subir(dona, case_id, PDF, "autos.pdf", "application/pdf")
    assert enviado.status_code == 201
    file_id = enviado.json()["id"]

    assert client.get(f'/cases/{case_id}/files', headers=intrusa).status_code == 404
    assert client.get(f'/cases/{case_id}/files/{file_id}', headers=intrusa).status_code == 404
    assert client.get(f'/cases/{case_id}/files', headers=dona).status_code == 200


def test_deleting_the_case_removes_the_uploaded_file_from_disk():
    headers = _conta("upload-exclusao")
    case_id = _caso(headers)
    enviado = _subir(headers, case_id, PDF, "autos.pdf", "application/pdf")
    assert enviado.status_code == 201

    with SessionLocal() as db:
        linha = db.scalar(select(StoredFile).where(StoredFile.case_id == case_id))
        caminho = storage_root() / linha.storage_key
    assert caminho.exists()

    assert client.delete(f'/cases/{case_id}', headers=headers).status_code == 200

    assert not caminho.exists(), "o blob cifrado não pode sobreviver à exclusão do caso"
    with SessionLocal() as db:
        assert db.scalar(select(Case).where(Case.id == case_id)) is None
        assert db.scalars(select(StoredFile).where(StoredFile.case_id == case_id)).all() == []
