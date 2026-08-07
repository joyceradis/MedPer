# Documentação do MedPer

Esta pasta concentra as especificações que orientam produto, metodologia, arquitetura e evolução segura do código.

## Leitura recomendada

### 1. Método do produto

[`MEDPER_METHOD.md`](./MEDPER_METHOD.md)

Define a sequência cognitiva da perícia médica e os princípios que a interface deve materializar.

### 2. Arquitetura

[`ARCHITECTURE.md`](./ARCHITECTURE.md)

Descreve a implementação atual, os invariantes, as fronteiras de responsabilidade, a arquitetura-alvo e as decisões pendentes.

### 3. Auditoria de regressão

[`AUDIT_REGRESSION.md`](./AUDIT_REGRESSION.md)

Registra o baseline funcional, riscos conhecidos, gates obrigatórios e critérios para mudanças estruturais.

### 4. Matriz de migração

[`FIELD_MIGRATION_MATRIX.md`](./FIELD_MIGRATION_MATRIX.md)

Relaciona os campos atuais às futuras etapas cognitivas sem quebrar o JSON existente.

### 5. Roadmap

[`../ROADMAP.md`](../ROADMAP.md)

Fonte oficial de priorização, dependências e critérios de conclusão.

---

## Hierarquia documental

Em caso de conflito:

1. regras de segurança e preservação de dados;
2. invariantes metodológicos;
3. arquitetura vigente;
4. roadmap ativo;
5. especificações de interface;
6. ideias de backlog.

Uma descrição histórica não prevalece sobre o código auditado e a documentação atualizada.

---

## Regra de atualização

Toda alteração relevante deve atualizar o documento correspondente:

| Mudança | Documento obrigatório |
|---|---|
| fluxo cognitivo | `MEDPER_METHOD.md` |
| estrutura de módulos | `ARCHITECTURE.md` |
| migração ou compatibilidade | `FIELD_MIGRATION_MATRIX.md` |
| risco ou gate | `AUDIT_REGRESSION.md` |
| prioridade ou status | `ROADMAP.md` |
| uso e visão geral | `README.md` da raiz |

Documentação desatualizada é tratada como defeito técnico.
