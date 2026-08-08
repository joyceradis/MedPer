# Auditoria — resolução metodológica contextual

Data: 2026-08-08
Status: implementação incorporada em `main`; automação verde

## Objetivo

Tornar explícita no código a regra já aprovada de que a metodologia não nasce apenas da matéria médico-pericial. O sistema deve considerar contexto da atuação, esfera/finalidade, papel, objeto e quesitos antes de sugerir protocolos e instrumentos.

## Achado de entrada

O store já distinguia `setting` de `legalSphere`, mas `js/methodology/protocols.js` ainda possuía resolução primária orientada por `context.matter`. Isso preservava o risco de tratar a mesma matéria como protocolo universal.

## Alterações

### Dados

`js/core/store.js` agora acrescenta IDs internos estáveis, preservando labels e campos legados:

- `context.settingId`
- `context.legalSphereId`
- `context.roleId`
- `context.matterId`
- `context.purposeId`

Também foram adicionados controles independentes para instrumentos:

- `methodology.activeInstrumentIds`
- `methodology.dismissedInstrumentIds`

### Resolução contextual

Novo módulo: `js/methodology/context-resolver.js`.

Responsabilidades:

- sugerir finalidade sem transformá-la em decisão jurídica;
- resolver perfil contextual;
- separar perfil contextual de protocolo-base;
- sugerir instrumentos sem confundi-los com protocolos;
- preservar controle médico sobre aceitação/rejeição.

Perfis iniciais formalizados:

- `civil + aesthetic_damage → aesthetic_damage_civil`
- `criminal + aesthetic_damage → aesthetic_damage_criminal`
- `labor + capacity → capacity_labor`
- `social_security + capacity → capacity_social_security`

Combinações não validadas recebem perfil genérico, sem regra inventada.

### AIPE

AIPE passou a ser governada também como instrumento auxiliar:

- sugerida no perfil cível de dano estético;
- não sugerida por padrão no perfil criminal de alteração estética/sequela;
- pode ser explicitamente aceita ou recusada;
- o audit engine só exige fundamentação AIPE quando o instrumento está ativo para o contexto;
- registro AIPE em contexto no qual o instrumento não está ativo gera ressalva metodológica, não aceitação silenciosa.

### Interface

Novo controlador: `js/ui/method-context-controller.js`.

Na etapa `Exame e método`, o MedPer passa a exibir:

- finalidade contextual;
- papel profissional;
- perfil contextual;
- prioridades/cautelas;
- instrumentos auxiliares;
- ação explícita para `Usar neste caso`;
- ação explícita para `Não usar`/remover.

Sugestão não é promovida silenciosamente a escolha médica.

## Compatibilidade

Não foram removidos:

- `context.sphere`
- `context.branch`
- `context.matter`
- protocolos existentes
- AIPE existente
- casos/exportações legados

O novo modelo acrescenta semântica canônica e IDs estáveis sem exigir migração destrutiva.

## Evidência TDD

### RED de domínio

PR de verificação `#31` confirmou falha do contrato antes da implementação.

### GREEN de domínio

PR `#32`:

- Frontend Audit: SUCCESS
- Regression Audit: SUCCESS

### Auditoria final do motor

PR `#33`:

- Frontend Audit run 192: SUCCESS
- Regression Audit run 104: SUCCESS

### RED de interface

PR `#34` falhou exatamente no novo gate `main must install the contextual methodology controller`.

### GREEN de interface

PR `#35`:

- Frontend Audit run 201: SUCCESS
- Regression Audit run 112: SUCCESS

## Limitações remanescentes

- Os protocolos-base antigos continuam existindo e serão progressivamente refinados por perfis contextuais; não houve reescrita destrutiva de `protocols.js`.
- Nem toda combinação esfera × objeto possui perfil validado; isso é intencional.
- A UI de criação do caso ainda utiliza labels históricos em alguns pontos. O store normaliza para IDs canônicos, mas a linguagem do wizard deve migrar posteriormente sem quebrar compatibilidade.
- Perfis novos só podem ser adicionados após validação metodológica e regressão correspondente.

## Regra congelada

> A mesma matéria médico-pericial pode exigir protocolos, perguntas, limites e linguagem conclusiva diferentes conforme o contexto da atuação, a finalidade pericial, o papel profissional e os quesitos. O sistema pode sugerir esse enquadramento; a decisão metodológica permanece do médico perito.
