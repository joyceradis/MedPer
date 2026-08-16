<div align="center">

# MedPer

### Método médico-pericial estruturado, rastreável e orientado ao objeto

[![Aplicação](https://img.shields.io/badge/GitHub%20Pages-Acessar%20MedPer-173f36?style=for-the-badge)](https://joyceradis.github.io/MedPer/)
[![Status](https://img.shields.io/badge/status-protótipo%20em%20desenvolvimento-b18a4b?style=for-the-badge)](#estado-atual)
[![PWA](https://img.shields.io/badge/PWA-offline--first-253238?style=for-the-badge)](#arquitetura-atual)

**Plataforma de apoio à organização do raciocínio médico-pericial, das evidências e do documento técnico final.**

> O MedPer não substitui o juízo médico. O sistema estrutura informações, explicita o método, identifica lacunas e produz uma base documental rastreável. A análise, a valoração, a conclusão e a assinatura permanecem sob responsabilidade exclusiva da médica ou do médico perito.

</div>

---

## Visão do produto

A perícia médica não começa pelo laudo. Começa pela compreensão da missão pericial.

O MedPer foi concebido para conduzir o trabalho na sequência em que um raciocínio técnico consistente deve ocorrer:

```text
Contexto e esfera
        ↓
Delimitação do objeto
        ↓
Autos, fontes e fatos
        ↓
Cronologia
        ↓
Hipóteses e diligências
        ↓
Exame e método aplicável
        ↓
Fundamentação técnico-científica
        ↓
Conclusão proporcional à prova
        ↓
Quesitos
        ↓
Documento final
```

O produto busca reduzir três riscos recorrentes:

1. começar a escrever antes de delimitar o objeto;
2. misturar fato, hipótese, interpretação e conclusão;
3. formular conclusões sem explicitar as evidências, limitações e o grau de sustentação.

---

## Princípios invariantes

- **Objeto antes do protocolo:** a matéria e o contexto determinam a metodologia aplicável.
- **Fatos antes de conclusões:** documentos, eventos, observações e achados permanecem separados da interpretação.
- **Nenhuma conclusão sem sustentação:** bloqueios e ressalvas metodológicas devem ser visíveis.
- **Proporcionalidade epistêmica:** a linguagem da conclusão deve refletir a suficiência real dos elementos disponíveis.
- **Rastreabilidade:** o documento final deve derivar do estado estruturado do caso.
- **Metodologias contextualizadas:** AIPE é aplicada somente ao dano estético; outros objetos utilizam protocolos próprios.
- **IA assistiva, nunca decisória:** recursos futuros de IA poderão organizar e revisar, mas não valorar dano, afirmar nexo ou substituir exame.
- **Validação humana obrigatória:** nenhuma saída é considerada laudo ou parecer válido sem revisão e assinatura profissional.

---

## Estado atual

O MedPer está em fase de **protótipo funcional e engenharia cognitiva**.

### Implementado

- site público separado da aplicação interna;
- PWA estático compatível com GitHub Pages;
- execução local e funcionamento offline;
- criação, abertura e persistência de casos no navegador;
- organização de perícias em andamento, concluídas e lixeira recuperável;
- migração retrocompatível das versões antigas do armazenamento;
- definição de esfera, ramo, papel profissional, matéria e modalidade;
- delimitação do objeto pericial;
- inventário de fontes e fatos médico-periciais;
- cronologia;
- metodologia geral obrigatória;
- protocolos guiados para dano estético, incapacidade, nexo causal/concausal e responsabilidade profissional;
- múltiplos protocolos aplicáveis no mesmo caso, com sugestão conservadora a partir do objeto e controle médico explícito;
- AIPE restrita ao dano estético, com tabelas de impressão, categorias 0–50 e critérios complementares abertas quando aplicável;
- matriz de decisão pericial;
- bloqueios e ressalvas metodológicas;
- quesitos;
- prévia do documento final;
- exportação JSON;
- superfície **Modelos e checklists** com o Protocolo de Conferência Pericial operando como ferramenta: oito dimensões colapsáveis, itens marcáveis, progresso por dimensão e conferência persistida por caso (`case.conference`);
- entrada AIPE derivada da tabela de referência, com a faixa visível no rótulo e preservação de registros feitos sob a escala anterior;
- revisão automatizada em dois modelos na CI, com o diff tratado como entrada não confiável;
- autenticação e modelo multiusuário preparados, ainda não conectados a ambiente real;
- suíte de regressão cobrindo migração, persistência, metodologia, superfícies, conhecimento, marca e runtime da CI.

### Em desenvolvimento

- reorganização da aplicação conforme o fluxo cognitivo da perícia;
- identificadores estáveis para respostas metodológicas;
- redução do acoplamento do módulo de interface;
- validação manual em desktop e mobile;
- projeto Supabase real;
- sincronização remota dos casos;
- testes de isolamento e permissões;
- assinatura, limites de uso e comercialização.

### Não disponível para produção

A versão pública atual **não deve ser utilizada com dados reais, identificáveis, sigilosos, assistenciais ou processuais**.

O modo local utiliza `localStorage`, sem as garantias necessárias de autenticação, segregação, criptografia, backup, controle de acesso e resposta a incidentes exigidas para operação real.

---

## Acessos

| Ambiente | Endereço | Finalidade |
|---|---|---|
| Site público | [`/MedPer/`](https://joyceradis.github.io/MedPer/) | apresentação institucional do produto |
| Aplicação | [`/MedPer/app.html`](https://joyceradis.github.io/MedPer/app.html) | protótipo operacional e modo local |
| Roadmap | [`ROADMAP.md`](./ROADMAP.md) | fonte de verdade das etapas do produto |
| Método | [`docs/MEDPER_METHOD.md`](./docs/MEDPER_METHOD.md) | especificação cognitiva e metodológica |
| Auditoria | [`docs/AUDIT_REGRESSION.md`](./docs/AUDIT_REGRESSION.md) | baseline e gates de regressão |

---

## Arquitetura atual

```text
Navegador
│
├── index.html                  site público
├── app.html                    aplicação médico-pericial
│
├── js/main.js                  composição e inicialização
│   ├── core/store.js           estado, normalização, migração e persistência
│   ├── core/case-lifecycle.js  andamento, conclusão, lixeira e restauração
│   ├── auth/                   autenticação preparada
│   ├── methodology/            protocolos, resolução adaptativa, AIPE e auditoria
│   └── ui/                     renderização, interação e diálogos
│
├── css/                        sistemas visuais público e interno
├── supabase/                   schema multiusuário e bootstrap
├── tests/                      testes de regressão
├── docs/                       especificações técnicas e metodológicas
│
├── manifest.webmanifest        metadados do PWA
└── sw.js                       cache, atualização e fallback offline
```

### Propriedade do estado

O arquivo `js/core/store.js` é o único proprietário do estado persistido no navegador.

```text
entrada do usuário
      ↓
normalização do caso
      ↓
persistência local
      ↓
notificação controlada da interface
```

As atualizações narrativas são persistidas sem reconstruir toda a interface a cada caractere. A atualização visual ocorre no encerramento da edição ou em respostas estruturadas que alterem imediatamente a auditoria metodológica.

### Compatibilidade de dados

O store atual reconhece:

- `medper.state.v4`;
- `medper.state.v3`;
- `medper.state.v2`;
- `mlks.prototype.v1`.

Quando uma chave antiga é encontrada, o conteúdo original é copiado para uma chave de backup antes da normalização.

---

## Estrutura do repositório

```text
MedPer/
├── index.html
├── app.html
├── README.md
├── ROADMAP.md
├── manifest.webmanifest
├── sw.js
├── icon.svg
│
├── css/
│   ├── marketing.css
│   ├── styles.css
│   ├── methodology.css
│   ├── guided-methodology.css
│   └── auth.css
│
├── js/
│   ├── main.js
│   ├── auth/
│   │   └── auth-controller.js
│   ├── config/
│   │   └── supabase-config.js
│   ├── core/
│   │   ├── store.js
│   │   └── case-lifecycle.js
│   ├── methodology/
│   │   ├── context-resolver.js
│   │   ├── protocols.js
│   │   ├── engine.js
│   │   └── aipe.js
│   ├── knowledge/
│   │   └── library.js          referências com autoridade e localizador
│   ├── models/
│   │   └── checklists.js       instrumentos de conferência, fora do motor
│   └── ui/
│       ├── workflow.js
│       ├── app.js
│       ├── dashboard-model.js
│       ├── dashboard-view.js
│       ├── surface-controller.js
│       ├── case-inspector.js
│       ├── inspector-controller.js
│       ├── method-context-controller.js
│       └── dialog-controller.js
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRODUCT_MAP.md          arquitetura de informação e superfícies
│   ├── STATUS.md               âncora operacional de retomada
│   ├── AUDIT_REGRESSION.md
│   ├── FIELD_MIGRATION_MATRIX.md
│   └── MEDPER_METHOD.md
│
├── supabase/
│   ├── schema.sql
│   └── 002_bootstrap_organization.sql
│
├── tests/
│   └── suítes de regressão (a cadeia canônica está em `package.json`)
│
└── .github/workflows/
    └── auditorias automatizadas
```

---

## Executar localmente

O projeto não exige build para a versão atual. Como utiliza módulos ES, deve ser servido por HTTP.

### Python

```bash
python3 -m http.server 8080
```

Acesse:

```text
http://localhost:8080/
http://localhost:8080/app.html
```

### Node.js

```bash
npx serve .
```

Não abra os arquivos diretamente com `file://`, pois imports ES, Service Worker e algumas APIs do navegador dependem de um contexto HTTP válido.

---

## Verificação técnica

### Sintaxe dos módulos

```bash
npm run check
```

A cadeia canônica de módulos verificados vive em `package.json`, no script `check`. Ela não é replicada aqui de propósito: uma lista copiada envelhece em silêncio, e a divergência entre documentação e código é exatamente o defeito que este projeto trata como bloqueio.

### Testes de regressão

```bash
npm test          # suíte completa
npm run audit     # check + test, a cadeia usada pela CI
```

As suítes cobrem persistência e migração de casos legados, metodologia contextual, protocolos e AIPE, superfícies do dashboard, camada de conhecimento, marca e âncora visual, fronteira do legado MLKS, e o runtime dos workflows do GitHub Actions.

A lista executável está em `package.json`, no script `test`. Um teste que existe no arquivo mas não está na cadeia não roda — e esse foi um defeito real encontrado neste repositório, por isso a cadeia é a fonte, não esta seção.

---

## Metodologia médico-pericial

O núcleo metodológico é composto por duas camadas.

### Método geral

Aplicável a todos os objetos:

1. delimitação;
2. material analisado;
3. execução técnica;
4. avaliação de consistência;
5. hipóteses e alternativas;
6. limitações;
7. grau de sustentação;
8. conclusão admissível.

### Protocolos específicos

| Matéria | Foco do protocolo |
|---|---|
| Dano estético | consolidação, descrição morfológica, percepção, fotografia, AIPE e fundamentação |
| Incapacidade | diagnóstico, déficit funcional, atividade habitual, capacidade residual e temporalidade |
| Nexo causal e concausa | evento, compatibilidade temporal/anatômica, plausibilidade, estado anterior e alternativas |
| Responsabilidade profissional | contexto assistencial, indicação, execução, acompanhamento, dano e nexo |
| Outras matérias | protocolo genérico estruturado, até existir módulo específico validado |

A documentação integral está em [`docs/MEDPER_METHOD.md`](./docs/MEDPER_METHOD.md).

---

## Modelo de dados futuro

O schema preparado para Supabase/PostgreSQL contempla:

```text
profiles
organizations
organization_members
plans
subscriptions
cases
case_collaborators
audit_events
```

A arquitetura futura prevê:

```text
Frontend PWA
    ↓
Supabase Auth
    ↓
PostgreSQL + Row-Level Security
    ↓
casos por usuário e organização
    ↓
armazenamento de arquivos
    ↓
auditoria, backup e retenção
```

Esse modelo ainda não está conectado à aplicação pública.

---

## Segurança e privacidade

Antes de produção, são obrigatórios:

- autenticação real;
- confirmação e recuperação de conta;
- segregação por usuário e organização;
- Row-Level Security testada com múltiplas identidades;
- criptografia em trânsito e em repouso;
- armazenamento seguro de documentos;
- trilha de auditoria;
- política de retenção e exclusão;
- backup e restauração testados;
- monitoramento e resposta a incidentes;
- termos de uso, política de privacidade e definição dos papéis de tratamento de dados.

Nunca devem ser incluídas no frontend:

- `service_role` do Supabase;
- chaves privadas de provedores;
- segredos de cobrança;
- credenciais de serviços de IA.

---

## Roadmap oficial

1. separar site público de dashboard — **concluído**;
2. projetar a experiência cognitiva e a identidade do produto — **em andamento**;
3. conectar Supabase real;
4. sincronizar casos;
5. testar isolamento e permissões;
6. implementar assinatura e limites;
7. criar onboarding;
8. publicar planos;
9. executar piloto fechado;
10. abrir venda pública.

A especificação completa e os critérios de aceite estão em [`ROADMAP.md`](./ROADMAP.md).

---

## Governança de mudanças

Nenhuma alteração estrutural deve ser considerada concluída sem:

1. escopo declarado;
2. preservação dos dados legados;
3. teste de regressão;
4. revisão do impacto metodológico;
5. validação manual da experiência afetada;
6. atualização da documentação correspondente.

Mudanças de interface, autenticação, persistência remota e cobrança não devem ser misturadas no mesmo conjunto de commits.

---

## Autoria e responsabilidade técnica do produto

O MedPer é idealizado e dirigido por **Dra. Joyce Radis de Souza de Oliveira — CRM-ES 21188**, médica e perita judicial.

O projeto encontra-se em desenvolvimento privado de produto, embora o protótipo técnico esteja publicado em repositório aberto. A presença do código no GitHub não representa autorização para uso clínico, pericial, comercial ou institucional sem validação própria e observância das normas aplicáveis.

---

<div align="center">

**MedPer — o método antes do documento.**

</div>
