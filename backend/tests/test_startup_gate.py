"""O app precisa recusar a subida quando a configuração é insegura.

`test_security_import.py` testa `assert_secure_startup()` isoladamente; aqui se
prova que o próprio app chama o portão no ciclo de vida. `TestClient(app)` sem
`with` não executa o lifespan — por isso o resto da suíte nunca exercitava isso.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


def test_app_recusa_subir_com_configuracao_insegura(monkeypatch):
    monkeypatch.setattr(type(settings), "security_issues", lambda self: ["segredo JWT fraco"])
    with pytest.raises(RuntimeError, match="Configuração de segurança inválida"):
        with TestClient(app):
            pass


def test_app_sobe_com_configuracao_segura():
    with TestClient(app) as client:
        assert client.get("/health").status_code in (200, 404)
