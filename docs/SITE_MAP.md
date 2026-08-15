# MedPer — mapa canônico de superfícies e fronteiras

Este mapa descreve o estado real do repositório. Ele separa superfícies visíveis do produto, camadas de runtime e infraestrutura de governança para evitar que compatibilidade legada, backend futuro ou automações de CI sejam confundidos com o fluxo médico-pericial atual.

## 1. Site público

`/` (`index.html`) — landing institucional pública.

Responsabilidade: apresentação do MedPer e entrada para a aplicação. Não possui estado pericial, não executa metodologia e não deve expor segredos ou configuração de infraestrutura.

## 2. Aplicação PWA

`/app.html` — entrada canônica da aplicação.

`js/main.js` — composition root do runtime atual.

`sw.js` + `manifest.webmanifest` — shell PWA/offline. O Service Worker deve conter os assets canônicos necessários para abrir o shell; ele não é proprietário de estado médico-pericial.

### 2.1 Superfícies operacionais

- `#/dashboard/overview` — **Visão geral**. Último caso, próximos prazos, pendências e atalhos.
- `#/dashboard/cases` — **Meus casos**. Filtros, lifecycle, organização e abertura do inspector.
- `#/dashboard/deadlines` — **Agenda e prazos**. Compromissos e criticidade temporal.
- `#/dashboard/references` — **Referências técnicas**. Biblioteca e governança documental.
- `#/dashboard/models` — **Modelos e checklists**. Área auxiliar governada.

### 2.2 Inspector contextual

Aberto sobre as superfícies operacionais ao selecionar um caso.

Responsabilidade: reconhecer o caso sem transformar o dashboard em mini-workspace. Responde que caso é, onde está, o que falta, próximo prazo, referências e atividade. Não contém campos de edição do raciocínio pericial.

### 2.3 Workspace médico-pericial

Rota canônica: `#/case/:caseId/:stage`

1. `delimitation` — Delimitação
2. `evidence` — Autos e evidências
3. `timeline` — Cronologia
4. `hypotheses` — Hipóteses e diligências
5. `method` — Exame e método
6. `reasoning` — Fundamentação
7. `conclusion` — Conclusão
8. `questions` — Quesitos
9. `report` — Documento

AIPE permanece dentro de `method` somente quando o domínio de dano estético e o contexto metodológico justificarem sua utilização. Instrumento, protocolo, referência e sugestão não equivalem a conclusão.

## 3. Camadas internas do runtime

### 3.1 Estado e persistência

`js/core/store.js` — **único owner do estado persistido no navegador**.

Responsabilidades: leitura, normalização, migração, backup de legado, persistência em `localStorage`, assinatura de alterações e compatibilidade entre campos históricos e canônicos.

`js/core/case-lifecycle.js` — andamento, conclusão, lixeira e restauração; não possui persistência própria.

### 3.2 Metodologia

`js/methodology/context-resolver.js` — resolve contexto → finalidade → perfil metodológico e sugestões, preservando escolha médica explícita.

`js/methodology/protocols.js` — método geral, protocolos-base e perguntas estruturadas/narrativas.

`js/methodology/engine.js` — bloqueios, ressalvas e completude. **Não produz automaticamente dano, nexo, incapacidade ou conclusão médico-pericial.**

`js/methodology/aipe.js` — referência/instrumento para dano estético quando pertinente; não é protocolo universal.

### 3.3 Conhecimento

`js/knowledge/library.js` — biblioteca declarativa de referências, natureza, autoridade, escopo e localização documental.

Fronteira: conhecimento informa e audita; não altera silenciosamente protocolo, pontuação, estado ou conclusão.

### 3.4 Interface

`js/ui/` — composição visual e controladores de dashboard, superfícies, inspector, workspace, contexto metodológico e diálogos.

Fronteira: a UI representa decisões e estado; não cria regra médica por conveniência visual.

### 3.5 Autenticação/configuração

`js/auth/` e `js/config/` — controles do shell de autenticação/configuração do frontend.

Fronteira: nenhum segredo de provedor, `service_role`, chave de API ou credencial privada pode existir no frontend.

## 4. Compatibilidade histórica

Chaves reconhecidas pelo store para migração:

- `medper.state.v4`
- `medper.state.v3`
- `medper.state.v2`
- `mlks.prototype.v1`

`data/mlks.schema.json` — schema **exclusivamente de compatibilidade histórica/importação**. Não é o modelo canônico do MedPer atual.

Entrypoints HTML históricos em `casos/` e `pages/` permanecem apenas como redirecionadores de bookmarks antigos para superfícies MedPer atuais. Eles não constituem segunda aplicação, segundo runtime ou segunda arquitetura de estado.

Regra: compatibilidade MLKS lê/migra história; não governa produto novo.

## 5. Backend / API

`backend/` — FastAPI + SQLAlchemy + Alembic para persistência multi-tenant, autenticação, entidades periciais e auditoria append-only.

**Estado atual:** existe como backend implementado no repositório, porém ainda não integra o runtime público da PWA. O frontend atual continua usando `localStorage` por meio de `js/core/store.js`.

Portanto, backend e banco remoto não devem ser descritos como persistência ativa do produto público até existir integração explícita, testada e documentada.

## 6. Governança do repositório e CI

Esta camada **não é uma superfície do produto em runtime**.

### 6.1 Gates determinísticos

`.github/workflows/` — auditorias de frontend, regressão, autenticação, backend e revisão automatizada.

`package.json` — `npm run check`, `npm test` e `npm run audit` compõem a verificação JS canônica. O gate de sintaxe inclui também os scripts do subsistema de revisão por IA.

`tests/` — regressões de store, contexto, metodologia, dashboard, UI, knowledge, lifecycle, legado e infraestrutura de revisão.

`tests/actions-runtime-regression.test.mjs` — contrato da própria infraestrutura de CI. Impede reintrodução de majors de Actions baseados no runtime Node 20 e exige os majors canônicos compatíveis com Node 24.

### 6.2 Runtime das GitHub Actions

As Actions JavaScript oficiais usadas pela infraestrutura de CI ficam em majors compatíveis com o **runtime Node.js 24 do GitHub Actions**. Essa camada é diferente da versão de linguagem usada para validar o produto.

- `actions/checkout@v6` — checkout canônico.
- `actions/setup-node@v7` — action em runtime atualizado; continua configurando `node-version: 20` para os gates JavaScript enquanto Node 20 permanecer no contrato de compatibilidade do projeto.
- `actions/setup-python@v6` — action em runtime atualizado; continua configurando Python `3.13` para os testes backend.
- `actions/upload-artifact@v7` e `actions/download-artifact@v5` — transporte de artefatos.
- `actions/github-script@v8` — publicação e atualização do comentário consolidado de revisão.

Nos jobs de revisão por IA, `actions/setup-node@v7` usa `package-manager-cache: false`: os clientes são ESM dependency-free executados diretamente por `node`, sem instalação de dependências npm.

Regra: atualizar o runtime interno das GitHub Actions **não altera** o runtime da PWA, o owner de persistência, o motor metodológico, a seleção de protocolos nem conclusões médico-periciais.

### 6.3 Revisão automatizada GPT + Claude

`.github/workflows/ai-review.yml` — orquestra revisão independente por dois modelos em PRs e pushes para `main`.

`.github/scripts/prepare-review.mjs` + `review-input.mjs` — calculam **uma única entrada canônica** para os dois revisores, resolvem o intervalo de commits, detectam alterações apenas documentais e registram truncamento do diff.

Em Pull Requests, o intervalo nasce do **merge-base entre a base alvo e o head**, evitando que avanço da branch alvo apareça como deleção ou alteração fantasma na revisão. Em pushes, o intervalo continua sendo `before → head`, com fallback para parent/empty tree quando `before` é zerado ou não pode ser recuperado.

O payload de revisão é textual: patches binários não são incorporados ao orçamento. Quando o teto de 60.000 bytes é atingido, a metadata registra inventário completo dos caminhos alterados, caminho parcialmente incluído e caminhos totalmente omitidos. O comentário consolidado também é limitado de forma conservadora e declara quando a resposta de algum revisor precisou ser truncada apenas para publicação no GitHub; o artefato do job permanece a fonte integral daquela execução.

`.github/scripts/review-openai.mjs` — cliente OpenAI via `fetch` nativo, com teto explícito de saída.

`.github/scripts/review-claude.mjs` — cliente Anthropic via `fetch` nativo. Para Opus 5, usa thinking adaptativo (`thinking.type = adaptive`), esforço explícito (`output_config.effort`, `high` por padrão), teto rígido de `max_tokens` e tratamento de `stop_reason`; `budget_tokens` não pertence ao contrato desta geração do modelo.

`.github/scripts/review-context.md` — invariantes do MedPer enviados igualmente aos dois revisores.

Fluxo:

```text
PR / push main
      ↓
prepare — checkout único + merge-base/range + diff canônico + metadata
      ↓
review-input artifact
      ├───────────────┐
      ↓               ↓
GPT review        Claude review
      └───────┬───────┘
              ↓
comentário consolidado, limitado e atualizável
```

Invariantes desta camada:

1. os dois revisores recebem o mesmo payload de diff;
2. diff > 60.000 bytes é marcado explicitamente como truncado e sua cobertura por caminho é declarada;
3. mudança somente documental pode evitar chamadas pagas de IA, mas arquivos operacionais de governança não podem ser tratados como documentação inócua;
4. comentários de PR são atualizados por marcador estável, em vez de multiplicados a cada push;
5. Pull Requests usam merge-base; pushes usam `before` quando recuperável e fallback seguro quando ele é zerado/inalcançável;
6. `OPENAI_API_KEY` e `ANTHROPIC_API_KEY` existem somente como GitHub Actions secrets quando ativadas;
7. revisão de IA é **advisory governance**: não altera arquivos automaticamente, não escreve estado de caso, não adota protocolo e não produz conclusão médico-pericial.

### 6.4 Fronteira de confiança dos secrets de revisão

A ativação de secrets em um workflow disparado por `pull_request` pressupõe que **quem pode publicar branches dentro deste mesmo repositório é um colaborador confiável para a infraestrutura de CI**. Uma branch do próprio repositório pode propor alteração do YAML do workflow; portanto, segredo de provedor não deve ser ativado sob a premissa falsa de que qualquer autor de branch é não confiável.

Enquanto o MedPer operar com branches internas controladas pela founder e agentes autorizados, essa é a fronteira explícita de confiança. Antes de admitir contribuição não confiável com capacidade de branch no mesmo repositório, a revisão paga deve migrar para uma fronteira que não entregue secrets ao YAML controlado pelo autor da PR — por exemplo, GitHub Environment com aprovação obrigatória ou execução base-controlled (`workflow_run`/arquitetura equivalente), com nova auditoria de permissões.

Pull Requests de forks devem degradar sem secrets e sem transformar ausência de permissão de escrita em falsa falha de revisão. A configuração concreta desse caminho permanece responsabilidade da camada de governança de Actions, não do runtime MedPer.

## 7. Regra arquitetural resumida

**Dashboard gere. Inspector reconhece. Workspace trabalha e raciocina. Biblioteca consulta e audita conhecimento.**

```text
SITE PÚBLICO apresenta
DASHBOARD gere
INSPECTOR reconhece
WORKSPACE trabalha e raciocina
MÉTODO estrutura sem concluir automaticamente
BIBLIOTECA informa e audita
STORE persiste e migra
LEGADO apenas compatibiliza
BACKEND aguarda integração explícita com a PWA
CI verifica o repositório sem entrar no runtime clínico-pericial
```
