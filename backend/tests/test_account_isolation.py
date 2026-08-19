import os
os.environ["MEDPER_DATABASE_URL"] = "sqlite:///./test_medper_isolation.db"

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import Base, engine, SessionLocal
from app.main import app
from app.models import Case, User

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
client = TestClient(app)

SENHA = "correct-horse-battery"


def _registrar(slug: str, email: str, senha: str = SENHA):
    return client.post('/auth/register', json={
        "organization_name": slug, "organization_slug": slug,
        "full_name": f"Perita {slug}", "email": email, "password": senha
    })


def _entrar(email: str, senha: str = SENHA):
    return client.post('/auth/token', data={"username": email, "password": senha})


def test_two_peritas_cannot_share_one_organization():
    """O isolamento é por organização, e o cadastro sempre cria uma nova.

    Não há fluxo de convite: cada registro abre a própria organização e recusa
    slug repetido. Com dezenas de peritas isso precisa continuar valendo, porque
    duas na mesma organização enxergariam os casos uma da outra.
    """
    primeira = _registrar("clinica-vitoria", "a@exemplo.br")
    assert primeira.status_code == 201
    repetida = _registrar("clinica-vitoria", "b@exemplo.br")
    assert repetida.status_code == 409, "slug repetido não pode reaproveitar organização"

    with SessionLocal() as db:
        usuarios = db.scalars(select(User).where(User.email.in_(["a@exemplo.br", "b@exemplo.br"]))).all()
        organizacoes = {u.organization_id for u in usuarios}
    assert len(organizacoes) == len(usuarios), "cada perita na própria organização"


def test_the_same_email_cannot_open_a_second_account():
    """O e-mail identifica a conta em todo o sistema, não dentro da organização.

    A unicidade era (organization_id, email), então o mesmo e-mail abria conta em
    organizações diferentes. O login busca só por e-mail — `select(User).where(
    User.email == ...)` — e devolve a PRIMEIRA linha que casar, com a organização
    dela. Consequências, ambas ruins:

    - senhas diferentes: a segunda perita nunca entra, sem mensagem que explique;
    - senhas iguais: ela entra na organização da primeira e vê os casos dela.

    O segundo caso é exposição de dado de saúde de terceiro entre contas, e o
    gatilho é banal — cadastrar duas vezes errando o slug na primeira.
    """
    assert _registrar("org-alfa", "mesma@exemplo.br").status_code == 201
    segunda = _registrar("org-beta", "mesma@exemplo.br")
    assert segunda.status_code == 409, "o e-mail já identifica uma conta"


def test_login_never_lands_in_someone_elses_organization():
    """Prova direta: mesma senha nas duas contas não pode cruzar organização."""
    assert _registrar("org-um", "cruzado@exemplo.br", SENHA).status_code == 201
    _registrar("org-dois", "cruzado@exemplo.br", SENHA)  # deve ser recusado

    entrada = _entrar("cruzado@exemplo.br", SENHA)
    assert entrada.status_code == 200
    headers = {"Authorization": "Bearer " + entrada.json()["access_token"]}

    perfil = client.get('/auth/me', headers=headers).json()
    assert perfil["organization_name"] == "org-um", "entrou na própria organização"

    # E o caso criado pertence a essa organização, não a outra.
    case_id = client.post('/cases', headers=headers, json={
        "title": "Caso", "objectType": "Dano estético"
    }).json()['id']
    with SessionLocal() as db:
        caso = db.scalar(select(Case).where(Case.id == case_id))
        dona = db.scalar(select(User).where(User.email == "cruzado@exemplo.br"))
        assert caso.organization_id == dona.organization_id
        contas = db.scalars(select(User).where(User.email == "cruzado@exemplo.br")).all()
        assert len(contas) == 1, "um e-mail, uma conta"
