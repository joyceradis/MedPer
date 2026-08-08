# MedPer — Modelo canônico de contexto jurídico-pericial

Data: 2026-08-08
Status: decisão arquitetural ativa

## 1. Problema corrigido

O schema legado usava `context.sphere` para valores como `Judicial` e `context.branch` para valores como `Cível`, `Trabalhista` ou `Criminal`. Esses valores não pertencem ao mesmo nível semântico.

Para evitar quebra de dados legados, os campos antigos permanecem preservados, mas deixam de ser a referência conceitual principal.

## 2. Campos canônicos

```text
context
├── setting          ambiente de atuação
├── legalSphere      esfera/contexto jurídico pertinente
├── role             papel profissional
├── tribunal         tribunal/órgão
├── unit             vara/unidade
├── feeRegime        AJG/particular/outro
├── matter           domínio/objeto médico-pericial primário
└── mode             modalidade da avaliação
```

### `setting`

Responde: **em que ambiente institucional ocorre a atuação?**

Exemplos: `Judicial`, `Administrativo`, `Extrajudicial`, `Ético-profissional`.

### `legalSphere`

Responde: **qual é o contexto jurídico-material relevante para interpretar o objeto e selecionar métodos?**

Exemplos: `Cível`, `Trabalhista`, `Criminal`, `Previdenciário`, conforme o caso.

O conjunto não deve ser tratado como taxonomia jurídica exaustiva. O campo existe para impedir que uma mesma matéria médico-pericial seja aplicada como protocolo universal fora de seu contexto.

## 3. Compatibilidade legada

Durante a transição:

```text
setting      ← context.setting || context.sphere
legalSphere  ← context.legalSphere || context.branch
```

Os campos `sphere` e `branch` não são apagados nem reescritos automaticamente. Isso preserva JSONs, casos existentes e rotas históricas enquanto a UI migra para os nomes canônicos.

## 4. Ordem cognitiva

```text
setting
  ↓
legalSphere
  ↓
role
  ↓
objeto/pergunta pericial
  ↓
matéria/domínios pertinentes
  ↓
métodos e instrumentos aplicáveis
```

A existência de `matter = Dano estético`, por exemplo, não autoriza carregar automaticamente a mesma abordagem em contexto Cível, Trabalhista e Criminal.

## 5. Gates

- preservar campos legados até migração versionada;
- não selecionar protocolo apenas por `matter` quando o contexto puder alterar sua aplicação;
- não transformar `legalSphere` em conclusão jurídica;
- o sistema organiza contexto para o raciocínio médico-pericial; não realiza enquadramento jurisdicional automático;
- qualquer regra contextual nova exige fonte, critério de aceite e regressão compatível com o risco.
