import os
os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper_identity.db"
os.environ["MEDPER_JWT_SECRET"] = "test-secret-that-is-longer-than-32-bytes"
from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)


def test_registration_keeps_the_professional_name():
    """O cadastro guardava tudo menos o nome de quem se cadastrava.

    O frontend enviava `full_name` desde sempre; `RegisterIn` não declarava o
    campo e o Pydantic o descartava em silêncio. Como a tabela `users` também
    não tinha coluna de nome, a interface não tinha de onde ler quem estava
    logada e caía num nome fixo no código — que, num piloto com várias peritas,
    mostrava a identidade da mesma pessoa a todas elas.
    """
    resposta = client.post('/auth/register', json={
        "organization_name": "Perícias Vitória",
        "organization_slug": "pericias-vitoria",
        "full_name": "Marina Toledo Alves",
        "email": "marina@exemplo.br",
        "password": "correct-horse-battery"
    })
    assert resposta.status_code == 201
    headers = {"Authorization": "Bearer " + resposta.json()["access_token"]}

    eu = client.get('/auth/me', headers=headers)
    assert eu.status_code == 200
    perfil = eu.json()
    assert perfil["full_name"] == "Marina Toledo Alves"
    assert perfil["email"] == "marina@exemplo.br"
    assert perfil["organization_name"] == "Perícias Vitória"
    assert perfil["id"]


def test_two_accounts_never_see_each_other_identity():
    """A garantia que o piloto exige: cada perita vê a si mesma."""
    segunda = client.post('/auth/register', json={
        "organization_name": "Clínica Serra",
        "organization_slug": "clinica-serra",
        "full_name": "Rafael Nunes Prado",
        "email": "rafael@exemplo.br",
        "password": "correct-horse-battery"
    })
    assert segunda.status_code == 201

    perfil = client.get('/auth/me', headers={
        "Authorization": "Bearer " + segunda.json()["access_token"]
    }).json()
    assert perfil["full_name"] == "Rafael Nunes Prado"
    assert perfil["organization_name"] == "Clínica Serra"


def test_account_without_name_is_valid_and_reports_none():
    """Conta criada antes da coluna existir continua funcionando.

    A ausência de nome é devolvida como string vazia para a interface decidir o
    que exibir — nunca preenchida com um nome inventado no servidor.
    """
    sem_nome = client.post('/auth/register', json={
        "organization_name": "Sem Nome",
        "organization_slug": "sem-nome",
        "email": "anonimo@exemplo.br",
        "password": "correct-horse-battery"
    })
    assert sem_nome.status_code == 201

    perfil = client.get('/auth/me', headers={
        "Authorization": "Bearer " + sem_nome.json()["access_token"]
    }).json()
    assert perfil["full_name"] == ""
    assert perfil["email"] == "anonimo@exemplo.br"


def test_me_requires_authentication():
    assert client.get('/auth/me').status_code in (401, 403)
