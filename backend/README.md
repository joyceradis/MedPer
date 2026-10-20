# MedPer API

Backend FastAPI/SQLAlchemy/Alembic para persistência multi-tenant do domínio pericial.

## Desenvolvimento

```bash
docker compose up --build
```

O Compose limita a porta a `127.0.0.1` e ativa explicitamente a API de desenvolvimento. Fora dele, a API inicia fechada: use `MEDPER_ENVIRONMENT=development` e `MEDPER_DEVELOPMENT_API_ENABLED=true` apenas no ambiente local.

Documentação interativa: `http://localhost:8000/docs`.

## Controles implementados

- isolamento por organização e por `owner_user_id` em todos os casos; cargos de organização não concedem acesso aos casos de colegas;
- senhas com Argon2;
- tokens JWT com expiração;
- evidências, observações, achados e conclusões como entidades distintas;
- conclusão rejeitada quando `evidenceIds` está vazio;
- validação de que evidências e achados citados pertencem ao mesmo caso;
- registro de auditoria para operações de criação;
- script PostgreSQL que revoga `UPDATE`, `DELETE` e `TRUNCATE` em `audit_log` do papel de aplicação.

## Entrada profissional e implantação

`professional.html` reutiliza a V2 com persistência remota. Os tokens permanecem em memória; o demonstrativo continua separado e local. A origem pública da API permanece vazia até a implantação.

As rotas de autenticação, casos, importação e arquivos retornam 503 antes de acessar o banco enquanto o modo profissional não estiver pronto. `/health` e `/ready` continuam públicos para monitoramento. Em staging/produção, a API exige `MEDPER_PROFESSIONAL_ENABLED=true`, PostgreSQL, JWT forte e chave Fernet válida. A opção de desenvolvimento não funciona nesses ambientes.

Esses requisitos técnicos não substituem os portões operacionais: TLS, isolamento por usuário/caso, RLS com papel restrito, restauração de backups, retenção, suporte e cobrança. Veja `docs/PROFESSIONAL_RUNTIME_GATES.md` na raiz do repositório.

Antes de atualizar um banco existente, siga `docs/CASE_OWNERSHIP.md`: a migração preserva casos sem autoria comprovada, mas não os expõe. O envio de lembretes usa o papel restrito e notifica somente a pessoa responsável pelo caso.
