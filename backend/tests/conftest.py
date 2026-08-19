"""Ambiente comum da suíte, carregado antes de qualquer módulo de teste.

`app.config.settings` é lido uma única vez, no import. Como o pytest importa os
módulos de teste em ordem alfabética, quem importasse o app primeiro congelava a
configuração — e as variáveis definidas no topo de um teste posterior chegavam
tarde demais. Isolado o arquivo passava; na suíte inteira, não.

Definir aqui garante que a chave de cifragem exista antes do primeiro import,
para todos. Em produção isso é papel do ambiente, não do código.
"""

import os

from cryptography.fernet import Fernet

os.environ.setdefault("MEDPER_JWT_SECRET", "test-secret-that-is-longer-than-32-bytes")
os.environ.setdefault("MEDPER_FILE_ENCRYPTION_KEY", Fernet.generate_key().decode("ascii"))
