# MedPer API

Backend FastAPI/SQLAlchemy/Alembic para persistência multi-tenant do domínio pericial.

## Desenvolvimento

```bash
docker compose up --build
```

Documentação interativa: `http://localhost:8000/docs`.

## Controles implementados

- isolamento por `organization_id` em todos os casos;
- senhas com Argon2;
- tokens JWT com expiração;
- evidências, observações, achados e conclusões como entidades distintas;
- conclusão rejeitada quando `evidenceIds` está vazio;
- validação de que evidências e achados citados pertencem ao mesmo caso;
- registro de auditoria para operações de criação;
- script PostgreSQL que revoga `UPDATE`, `DELETE` e `TRUNCATE` em `audit_log` do papel de aplicação.

## Limite atual

A branch ainda não conecta o frontend PWA à API. Até essa integração, o frontend continua usando `localStorage`. Não use dados reais em produção sem TLS, gestão de segredos, backups, logs, política de retenção e revisão de segurança.
