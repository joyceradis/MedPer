# Contribuição e governança de mudanças

O MedPer combina domínio médico-pericial, segurança de dados e engenharia de software. Alterações aparentemente visuais podem modificar o significado de uma regra técnica. Por isso, contribuições devem ser pequenas, rastreáveis e acompanhadas de evidência compatível com o risco.

## Antes de alterar

Leia:

1. `README.md`;
2. `ROADMAP.md`;
3. `docs/MEDPER_METHOD.md`;
4. `docs/ARCHITECTURE.md`;
5. `docs/AUDIT_REGRESSION.md`;
6. `docs/FIELD_MIGRATION_MATRIX.md`.

## Classificação da mudança

Toda alteração deve declarar uma categoria:

- `docs`: documentação;
- `fix`: correção sem mudança intencional de comportamento;
- `refactor`: reorganização interna com comportamento preservado;
- `feat`: nova funcionalidade;
- `methodology`: regra ou protocolo médico-pericial;
- `security`: autenticação, autorização, segredo ou proteção de dados;
- `pwa`: cache, manifesto ou offline;
- `data`: schema, migração ou compatibilidade;
- `ci`: testes e automação.

## Regra de escopo

Não misture no mesmo conjunto de commits:

- redesign e alteração do schema;
- autenticação e refatoração cognitiva;
- cobrança e persistência;
- mudança de rótulo e mudança silenciosa do valor metodológico;
- limpeza de arquivos e alteração funcional;
- atualização do Service Worker sem revisão do shell.

## Fluxo recomendado

```text
issue ou requisito
      ↓
escopo e critérios de aceite
      ↓
branch específica
      ↓
implementação mínima
      ↓
testes automáticos
      ↓
teste manual dirigido
      ↓
revisão do diff
      ↓
atualização documental
      ↓
merge
```

## Convenção de branch

```text
feat/<assunto>
fix/<assunto>
refactor/<assunto>
docs/<assunto>
audit/<assunto>
security/<assunto>
```

## Convenção de commit

Exemplos:

```text
fix: preserve focus during narrative editing
docs: align architecture with current implementation
methodology: add stable identifiers to capacity answers
test: cover migration of legacy guided values
pwa: invalidate cache after application shell change
```

## Checklist obrigatório

### Código

- [ ] O escopo está limitado ao requisito?
- [ ] Nenhum segredo foi incluído?
- [ ] O `localStorage` continua pertencendo apenas ao store?
- [ ] Casos antigos continuam sendo normalizados?
- [ ] O JSON exportado permanece compatível ou possui migração?
- [ ] AIPE permanece restrita ao dano estético?
- [ ] As regras usam valores estáveis e não texto visual, quando aplicável?
- [ ] O Service Worker contém todos os assets necessários?

### Testes

- [ ] `node --check` foi executado nos arquivos alterados?
- [ ] `node tests/store-regression.test.mjs` passou?
- [ ] O fluxo alterado foi testado manualmente?
- [ ] Cancelar, voltar, atualizar e reabrir foram testados?
- [ ] Desktop e mobile foram avaliados quando a interface mudou?

### Documentação

- [ ] README continua verdadeiro?
- [ ] Arquitetura foi atualizada se houve mudança estrutural?
- [ ] Matriz de migração foi atualizada se houve mudança de dados?
- [ ] Auditoria registra novos riscos?
- [ ] Roadmap reflete o status real?

## Mudanças metodológicas

Toda modificação em `js/methodology/` deve informar:

1. objeto pericial afetado;
2. fundamento da regra;
3. comportamento anterior;
4. comportamento novo;
5. migração dos valores existentes;
6. teste que evita regressão;
7. impacto no documento final.

Uma melhoria textual de pergunta não deve alterar o contrato interno da resposta.

## Segurança

Não abra issue pública contendo:

- dados de paciente;
- número processual real associado a dados sensíveis;
- credenciais;
- chaves;
- tokens;
- vulnerabilidade explorável antes de correção coordenada.

Consulte `SECURITY.md`.

## Critério de conclusão

“Código escrito” não equivale a entrega concluída.

Uma entrega só pode ser declarada completa quando:

- os critérios estiverem cobertos;
- o comportamento estiver demonstrado;
- os testes relevantes tiverem passado;
- as limitações restantes estiverem explícitas;
- a documentação corresponder ao estado real.
