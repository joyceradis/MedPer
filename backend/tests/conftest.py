"""Ambiente comum da suíte, carregado antes de qualquer módulo de teste.

`app.config.settings` é lido uma única vez, no import. Como o pytest importa os
módulos de teste em ordem alfabética, quem importasse o app primeiro congelava a
configuração — e as variáveis definidas no topo de um teste posterior chegavam
tarde demais. Isolado o arquivo passava; na suíte inteira, não.

Definir aqui garante que a chave de cifragem exista antes do primeiro import,
para todos. Em produção isso é papel do ambiente, não do código.
"""

import os
from pathlib import Path

from cryptography.fernet import Fernet

os.environ.setdefault("MEDPER_JWT_SECRET", "test-secret-that-is-longer-than-32-bytes")
os.environ.setdefault("MEDPER_FILE_ENCRYPTION_KEY", Fernet.generate_key().decode("ascii"))

# Um banco de teste para toda a suíte, apagado a cada execução.
#
# `test_security_import.py` não declarava URL de teste e por isso escrevia no
# banco PADRÃO (`medper.db`), que sobrevive entre execuções: na segunda rodada
# as organizações já existiam e o registro devolvia 409. Os demais arquivos
# declaravam URLs diferentes, mas a engine é ligada no primeiro import de
# `app.db` — quem importasse primeiro decidia por todos, e a ordem é alfabética.
#
# Fixar aqui e ligar a engine antes de qualquer módulo de teste torna a suíte
# determinística e impede que um teste toque o banco de desenvolvimento.
_BANCO = Path(__file__).resolve().parent.parent / "test_medper_suite.db"
_BANCO.unlink(missing_ok=True)
os.environ["MEDPER_DATABASE_URL"] = f"sqlite:///{_BANCO}"

import app.db  # noqa: E402,F401  — liga a engine à URL acima antes dos módulos


import pytest


@pytest.fixture(scope="session", autouse=True)
def _schema_pronto():
    """Garante o esquema antes de qualquer teste rodar.

    Os módulos de teste criavam as tabelas no nível do módulo, o que roda na
    COLETA: quem fosse importado por último ganhava, e a ordem é alfabética. Um
    arquivo novo mudava a ordem e derrubava outro — `test_security_import.py`,
    que não cria esquema nenhum, dependia inteiramente dessa carona e sozinho
    falhava 5 de 7.

    O fixture roda depois de toda a coleta e antes do primeiro teste, então o
    esquema existe independentemente de ordem de import.
    """
    from app.db import Base, engine
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(autouse=True)
def _limitador_limpo():
    """Zera o limitador de taxa entre testes.

    `_hits` é dicionário de módulo, vivo durante todo o processo. Um teste que
    faz login consome cota de outro que espera contador zerado — e o segundo
    falha por 429 onde esperava 401, num arquivo que ele nem toca. Acoplamento
    invisível entre arquivos, que só aparece quando alguém acrescenta um teste
    que autentica.
    """
    from app.rate_limit import _hits, _lock
    with _lock:
        _hits.clear()
    yield
    with _lock:
        _hits.clear()
