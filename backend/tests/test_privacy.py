import os
os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper_privacy.db"
os.environ["MEDPER_JWT_SECRET"] = "test-secret-that-is-longer-than-32-bytes"

# A chave de cifragem vem do conftest.py, que o pytest carrega antes de qualquer
# módulo de teste — definir aqui seria tarde demais quando a suíte roda inteira.
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.db import Base, engine, SessionLocal
from app.main import app
from app.models import AuditLog, Case
from app.payload_crypto import ENVELOPE_KEY, decrypt_payload, encrypt_payload, is_encrypted

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)


def _conta(slug: str) -> dict:
    resposta = client.post('/auth/register', json={
        "organization_name": slug,
        "organization_slug": slug,
        "full_name": "Perita de Teste",
        "email": f"{slug}@exemplo.br",
        "password": "correct-horse-battery"
    })
    assert resposta.status_code == 201
    return {"Authorization": "Bearer " + resposta.json()["access_token"]}


# O conteúdo da perícia é o dado mais sensível do sistema — história do
# periciado, exame, achados, conclusão. Os anexos já eram cifrados; o estado do
# caso era gravado em JSON puro.

def test_case_content_is_not_readable_in_the_database():
    headers = _conta("cripto")
    case_id = client.post('/cases', headers=headers, json={
        "title": "Caso", "objectType": "Dano estético"
    }).json()['id']

    segredo = "queimadura de terceiro grau em face, periciado A.B.C."
    guardar = client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": {"scope": segredo}, "expectedRevision": 0
    })
    assert guardar.status_code == 200

    # A leitura pela API devolve o conteúdo normalmente.
    lido = client.get(f'/cases/{case_id}/state', headers=headers)
    assert lido.status_code == 200
    assert lido.json()["payload"]["scope"] == segredo

    # A coluna, porém, não contém o texto em claro.
    with SessionLocal() as db:
        bruto = db.scalar(select(Case).where(Case.id == case_id)).state_payload
    assert is_encrypted(bruto), "o payload precisa estar cifrado em repouso"
    assert segredo not in str(bruto), "o conteúdo da perícia não pode ser legível na coluna"


def test_rows_written_before_encryption_still_open():
    """Compatibilidade: bases existentes têm linhas em claro e não podem quebrar."""
    headers = _conta("legado")
    case_id = client.post('/cases', headers=headers, json={
        "title": "Antigo", "objectType": "Dano corporal"
    }).json()['id']

    # Simula uma linha gravada antes desta mudança.
    with SessionLocal() as db:
        caso = db.scalar(select(Case).where(Case.id == case_id))
        caso.state_payload = {"scope": "gravado em claro"}
        db.commit()

    lido = client.get(f'/cases/{case_id}/state', headers=headers)
    assert lido.status_code == 200
    assert lido.json()["payload"]["scope"] == "gravado em claro"

    # E a próxima escrita já cifra — a base migra sozinha, sem script.
    # A revisão continua 0: a linha em claro foi posta direto no banco, sem
    # passar pela rota que a incrementa.
    reescrita = client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": {"scope": "reescrito"}, "expectedRevision": 0
    })
    assert reescrita.status_code == 200
    with SessionLocal() as db:
        assert is_encrypted(db.scalar(select(Case).where(Case.id == case_id)).state_payload)


def test_roundtrip_preserves_structure_and_accents():
    original = {"scope": "avaliação estética", "n": 3, "lista": [1, {"a": None}], "vazio": {}}
    assert decrypt_payload(encrypt_payload(original)) == original
    assert decrypt_payload(None) == {}
    assert decrypt_payload({}) == {}
    assert ENVELOPE_KEY in encrypt_payload({"x": 1})


# Sem exclusão não há como atender pedido de eliminação nem remover um caso
# aberto por engano.

def test_deleting_a_case_removes_its_content_and_keeps_the_audit_record():
    headers = _conta("exclusao")
    case_id = client.post('/cases', headers=headers, json={
        "title": "A excluir", "objectType": "Dano estético"
    }).json()['id']
    evidencia = client.post(f'/cases/{case_id}/evidence', headers=headers, json={
        "type": "Documento", "title": "Prontuário", "description": "d"
    })
    assert evidencia.status_code == 201
    client.put(f'/cases/{case_id}/state', headers=headers, json={
        "payload": {"scope": "conteúdo sensível"}, "expectedRevision": 0
    })

    apagar = client.delete(f'/cases/{case_id}', headers=headers)
    assert apagar.status_code == 200
    assert apagar.json()["evidence"] == 1

    assert client.get(f'/cases/{case_id}/state', headers=headers).status_code == 404

    with SessionLocal() as db:
        assert db.scalar(select(Case).where(Case.id == case_id)) is None
        # A trilha sobrevive à exclusão e não guarda conteúdo.
        registro = db.scalars(
            select(AuditLog).where(AuditLog.entity_id == case_id, AuditLog.action == "delete")
        ).all()
        assert len(registro) == 1
        assert "sensível" not in (registro[0].payload or "")


def test_a_case_cannot_be_deleted_from_another_organization():
    dona = _conta("dona")
    intrusa = _conta("intrusa")
    case_id = client.post('/cases', headers=dona, json={
        "title": "Alheio", "objectType": "Dano corporal"
    }).json()['id']

    assert client.delete(f'/cases/{case_id}', headers=intrusa).status_code == 404
    assert client.get(f'/cases/{case_id}/state', headers=dona).status_code == 200


def test_deleting_twice_is_not_an_error_the_second_time_it_is_absent():
    headers = _conta("duplo")
    case_id = client.post('/cases', headers=headers, json={
        "title": "X", "objectType": "Dano estético"
    }).json()['id']
    assert client.delete(f'/cases/{case_id}', headers=headers).status_code == 200
    assert client.delete(f'/cases/{case_id}', headers=headers).status_code == 404
