# Arquitetura do MedPer

## 1. Escopo deste documento

Este documento descreve:

- a arquitetura efetivamente utilizada pelo protótipo atual;
- os limites de segurança e operação da versão pública;
- os invariantes que devem permanecer durante refatorações;
- a arquitetura-alvo para autenticação, sincronização e comercialização.

Não descreve funcionalidades hipotéticas como se já estivessem disponíveis.

---

## 2. Decisão arquitetural central

O MedPer não é um editor de texto com formulários anexos e não deve evoluir para um gerador automático de laudos.

O sistema é uma aplicação orientada por estado estruturado. O documento final é uma projeção desse estado.

```text
Caso estruturado
│
├── contexto
├── objeto pericial
├── fontes e fatos
├── cronologia
├── método geral
├── protocolo específico
├── matriz de decisão
├── quesitos
└── conclusão admissível
        ↓
renderização documental
```

A interface pode ser reorganizada. O significado e a compatibilidade dos dados precisam permanecer.

---

## 3. Invariantes

### 3.1 Domínio médico-pericial

1. o contexto precede a seleção do protocolo;
2. o objeto precede exame e conclusão;
3. fatos e fontes não são conclusões;
4. hipótese, fundamento e conclusão são entidades cognitivamente distintas;
5. a conclusão deve ser proporcional à suficiência da prova;
6. AIPE é restrita ao dano estético;
7. resultado adverso não equivale automaticamente a erro;
8. diagnóstico isolado não demonstra incapacidade;
9. ausência de consolidação impede conclusão estética permanente definitiva;
10. a decisão técnica permanece humana.

### 3.2 Engenharia

1. `js/core/store.js` é o único proprietário do estado persistido no navegador;
2. não deve existir um segundo acesso concorrente ao `localStorage`;
3. casos legados não podem ser apagados ou renomeados sem migração;
4. rótulos visíveis não devem ser utilizados como contrato permanente do domínio;
5. site público e aplicação são entradas distintas;
6. Service Worker não pode trocar o fallback da landing pelo da aplicação;
7. mudanças cognitivas não devem incluir simultaneamente autenticação, cobrança ou sincronização remota;
8. nenhum segredo pode existir no frontend;
9. conclusão de tarefa exige evidência de teste compatível com o risco;
10. documentação e código devem descrever o mesmo estado do produto.

---

## 4. Arquitetura atual

### 4.1 Visão geral

```text
GitHub Pages
│
├── index.html
│     └── site público
│
└── app.html
      └── js/main.js
            ├── core/store.js
            ├── auth/auth-controller.js
            ├── methodology/protocols.js
            ├── methodology/engine.js
            ├── knowledge/library.js
            ├── ui/app.js
            └── ui/dialog-controller.js
```

A aplicação é um PWA estático, sem servidor próprio e sem banco conectado.

### 4.2 Inicialização

`js/main.js` atua como composition root:

1. localiza os elementos principais da página;
2. cria o store;
3. instala o controlador de diálogos;
4. inicializa o controlador de autenticação;
5. libera a aplicação em modo local ou após sessão válida;
6. registra o Service Worker.

O arquivo possui proteção contra inicialização duplicada.

### 4.3 Estado e persistência

`js/core/store.js` é responsável por:

- leitura do estado;
- migração de chaves legadas;
- normalização dos casos;
- sincronização de campos compatíveis;
- persistência em `localStorage`;
- assinatura de alterações;
- atualizações silenciosas durante digitação;
- notificação explícita ao encerrar uma edição.

`js/core/case-lifecycle.js` mantém as transições de andamento, conclusão, lixeira e restauração. A persistência continua exclusiva do store.

Fluxo de atualização narrativa:

```text
input
  ↓
store.update(..., { notify: false })
  ↓
normalização
  ↓
persistência
  ↓
change / blur
  ↓
store.notify()
  ↓
reavaliação da interface
```

Isso evita reconstrução integral do DOM a cada caractere.

### 4.4 Compatibilidade

Chaves reconhecidas:

```text
medper.state.v4
medper.state.v3
medper.state.v2
mlks.prototype.v1
```

Uma versão antiga é copiada para uma chave de backup antes da migração.

O objeto pericial possui um campo canônico em:

```text
methodology.general.object
```

O campo histórico `scope` é mantido como alias de compatibilidade durante a fase de transição.

### 4.5 Motor metodológico

`js/methodology/protocols.js` define:

- método geral;
- perguntas narrativas;
- perguntas estruturadas;
- protocolos específicos;
- protocolo genérico de fallback.

Os protocolos são endereçados internamente por IDs estáveis (`aesthetic`, `capacity`, `causation`, `liability`), separados dos rótulos visíveis e com mapa de compatibilidade para matérias legadas. O mesmo módulo resolve protocolos aplicáveis combinando a matéria primária, módulos adicionais escolhidos pela médica e sugestões conservadoras derivadas do objeto. A matéria primária legada não é reescrita. `js/methodology/aipe.js` contém somente tabelas declarativas de referência AIPE e não executa decisão ou pontuação automática.

`js/methodology/engine.js` executa:

- auditoria do caso;
- contagem de bloqueios e ressalvas;
- avaliação de completude;
- salvaguardas específicas por matéria.

`js/knowledge/library.js` é uma camada declarativa separada do motor metodológico. Ela classifica fontes por natureza, autoridade, versão, âmbito e tema; mantém localizadores exatos e divergências; e resolve apenas quais referências são pertinentes ao assunto e à etapa cognitiva. Não importa nem modifica `engine.js` ou `protocols.js`, não persiste estado e não gera conclusões. A governança dessa camada está em `docs/KNOWLEDGE_REFERENCES.md`.

Algumas respostas estruturadas ainda comparam rótulos de opções legadas. A identidade dos protocolos, entretanto, já não depende desses rótulos.

### 4.6 Interface

`js/ui/workflow.js` define as nove etapas cognitivas do Método MedPer e traduz rotas antigas (`summary`, `documents`, `analysis`) para a navegação atual sem invalidar links legados.

`js/ui/app.js` ainda concentra:

- roteamento por hash;
- renderização;
- navegação;
- eventos;
- modais de criação;
- mutações de entidades;
- exportação JSON.

Esse arquivo é funcional, porém monolítico. A decomposição será incremental, sem reescrita ampla e sem alteração simultânea do schema dos casos.

### 4.7 PWA

`sw.js` utiliza:

- precache do shell;
- limpeza de caches antigos;
- network-first para HTML, CSS e JavaScript;
- cache para demais assets;
- fallback separado entre `index.html` e `app.html`.

O nome do cache deve ser alterado quando assets críticos forem modificados.

### 4.8 Autenticação preparada

O controlador atual contém fluxos para:

- e-mail e senha;
- cadastro;
- Google OAuth;
- sessão persistente;
- logout;
- modo local;
- preparação do espaço organizacional.

Entretanto, o Supabase não está conectado a um projeto real. Portanto, autenticação e segregação não devem ser anunciadas como operacionais.

---

## 5. Estrutura de domínio atual

Representação simplificada de um caso:

```text
Case
├── id
├── title
├── reference
├── status
├── context
│   ├── sphere
│   ├── branch
│   ├── role
│   ├── matter
│   └── mode
├── person
├── scope
├── documentGaps
├── evidence[]
├── facts[]
├── events[]
├── questions[]
├── conclusions[]
└── methodology
    ├── general
    ├── specific
    ├── guided
    └── decision
```

A matriz completa de reorganização dos campos está em `docs/FIELD_MIGRATION_MATRIX.md`.

---

## 6. Fronteiras de responsabilidade

| Módulo | Responsabilidade | Não deve assumir |
|---|---|---|
| `main.js` | composição e inicialização | regras periciais |
| `store.js` | estado, migração e persistência | renderização |
| `protocols.js` | definição declarativa dos métodos | acesso ao DOM |
| `engine.js` | auditoria e completude | redação visual |
| `auth-controller.js` | sessão e acesso | persistência dos casos |
| `ui/app.js` | apresentação e interação | armazenamento direto |
| `dialog-controller.js` | comportamento transversal de diálogos | regras de domínio |
| `sw.js` | cache e offline | autorização ou dados |

---

## 7. Testes e gates

### 7.1 Testes automatizados atuais

A suíte `tests/store-regression.test.mjs` verifica:

- migração de objeto legado;
- preservação do objeto canônico;
- resolução de conflitos;
- sincronização bidirecional durante transição;
- backup de estado antigo;
- preservação das coleções;
- recuperação após JSON inválido;
- persistência sem notificação;
- notificação explícita.

### 7.2 Gates obrigatórios

Antes de mudança estrutural:

1. executar verificação de sintaxe;
2. executar testes de regressão;
3. revisar compatibilidade do JSON;
4. validar o risco metodológico;
5. testar manualmente o fluxo afetado;
6. registrar limitação não coberta.

---

## 8. Arquitetura-alvo

### 8.1 Visão geral

```text
Site público

Aplicação PWA
    │
    ├── camada de apresentação
    ├── casos de uso
    ├── domínio médico-pericial
    ├── repositórios
    └── sincronização offline
            │
            ▼
Supabase Auth
PostgreSQL + RLS
Object Storage
Audit Log
Funções server-side
Provedor de cobrança
Monitoramento
```

### 8.2 Banco multiusuário

Tabelas já modeladas:

- `profiles`;
- `organizations`;
- `organization_members`;
- `plans`;
- `subscriptions`;
- `cases`;
- `case_collaborators`;
- `audit_events`.

O schema contém políticas iniciais de RLS, mas elas precisam ser aplicadas e testadas com múltiplas identidades antes de uso real.

### 8.3 Sincronização

Fluxo pretendido:

```text
edição local
  ↓
rascunho persistido
  ↓
salvamento remoto versionado
  ↓
confirmação do servidor
  ↓
atualização do estado de sincronização
```

Requisitos:

- versionamento otimista;
- prevenção de sobrescrita silenciosa;
- tratamento de conflito;
- fila offline;
- idempotência;
- migração assistida do armazenamento local;
- rastreabilidade das alterações.

### 8.4 Arquivos

Documentos e fotografias não devem ser incluídos diretamente no JSON do caso.

Arquitetura prevista:

```text
objeto no storage
+ hash
+ metadados
+ associação ao caso
+ controle de acesso
+ política de retenção
```

### 8.5 Assinaturas e limites

O acesso comercial deverá depender de estado server-side:

- plano;
- assinatura;
- status de pagamento;
- quantidade de assentos;
- limite de casos;
- permissões da organização.

Bloqueios exclusivamente visuais não são mecanismos de licenciamento.

---

## 9. Segurança

### 9.1 Frontend

Permitido:

- URL pública do projeto;
- publishable key do Supabase;
- configurações não secretas.

Proibido:

- `service_role`;
- credenciais privadas;
- chaves de IA;
- segredos de cobrança;
- tokens administrativos.

### 9.2 Produção

Requisitos mínimos:

- RLS validada;
- sessões e revogação;
- recuperação de conta;
- SMTP próprio;
- controle de arquivos;
- auditoria;
- backup e restauração;
- política de retenção;
- logs centralizados;
- gestão de incidentes;
- documentação LGPD.

---

## 10. Estratégia de evolução

A ordem oficial é:

1. separar site e aplicação;
2. projetar experiência cognitiva e identidade;
3. conectar Supabase;
4. sincronizar casos;
5. validar isolamento;
6. implementar cobrança e limites;
7. criar onboarding;
8. publicar planos;
9. executar piloto fechado;
10. abrir venda pública.

A fase ativa deve ser concluída pelos critérios de aceite antes de a seguinte ser declarada pronta.

---

## 11. Decisões pendentes

- formato definitivo dos identificadores estáveis das respostas;
- decomposição gradual de `ui/app.js`;
- modelo de conflito de sincronização;
- estratégia de importação/exportação em produção;
- granularidade da auditoria;
- política de visibilidade entre membro, administrador e proprietário;
- modelo comercial e limites;
- infraestrutura de processamento de arquivos;
- papel futuro de IA e suas salvaguardas.

Esses itens são decisões arquiteturais; não devem ser resolvidos incidentalmente dentro de alterações visuais.
