# Arquitetura do MedPer

## 1. Escopo

Este documento descreve a arquitetura efetivamente utilizada pelo protótipo atual, seus invariantes e os limites entre estado, metodologia, conhecimento, interface e infraestrutura futura.

Não descreve funcionalidades hipotéticas como se já estivessem operacionais.

---

## 2. Decisão arquitetural central

O MedPer é uma aplicação orientada por estado estruturado e por raciocínio médico-pericial contextual. O documento final é uma projeção desse estado; não é o ponto de partida.

```text
NÚCLEO MÉDICO-PERICIAL TRANSVERSAL
        ↓
CONTEXTO DA ATUAÇÃO
        ↓
ESFERA / FINALIDADE
        ↓
PAPEL / MISSÃO / QUESITOS
        ↓
OBJETO MÉDICO-PERICIAL
        ↓
PERFIL CONTEXTUAL
        ↓
MÉTODO GERAL
+ PROTOCOLO(S)
+ INSTRUMENTO(S) POSSÍVEIS
        ↓
EVIDÊNCIAS / EXAME / ANÁLISE
        ↓
CONCLUSÃO MÉDICA PROPORCIONAL
        ↓
DOCUMENTO
```

A mesma matéria pode exigir protocolos, perguntas, limites e linguagem conclusiva diferentes conforme contexto, finalidade, papel profissional e quesitos.

**Inteligência de enquadramento, não inteligência de conclusão.**

---

## 3. Invariantes

### 3.1 Domínio médico-pericial

1. contexto e missão precedem seleção metodológica específica;
2. objeto precede exame e conclusão;
3. fatos, achados, hipóteses e conclusões permanecem distinguíveis;
4. conclusão é proporcional à suficiência dos elementos;
5. sugestão de protocolo ou instrumento não equivale a adoção;
6. instrumento não equivale a protocolo;
7. AIPE é instrumento possível para dano estético quando pertinente, não regra universal;
8. resultado adverso não equivale automaticamente a erro;
9. diagnóstico isolado não demonstra incapacidade;
10. ausência de consolidação impede conclusão estética permanente definitiva;
11. combinações contextuais não validadas usam método geral + seleção manual;
12. a decisão técnica permanece humana.

### 3.2 Engenharia

1. `js/core/store.js` é o único proprietário do estado persistido no navegador;
2. casos legados não podem ser apagados sem migração;
3. labels visíveis não são contratos permanentes do domínio;
4. IDs internos estáveis devem sobreviver à mudança de redação da UI;
5. site público e aplicação são entradas distintas;
6. UI não pode alterar regras médicas por conveniência visual;
7. knowledge layer não controla o motor decisório;
8. nenhum segredo pode existir no frontend;
9. Service Worker deve conter todos os assets canônicos necessários ao offline shell;
10. mudança metodológica exige regressão compatível com o risco;
11. documentação e código devem descrever o mesmo estado real.

---

## 4. Composição atual

```text
GitHub Pages
│
├── index.html                 site público
│
└── app.html                   aplicação
      └── js/main.js           composition root
            ├── core/store.js
            ├── core/case-lifecycle.js
            ├── auth/auth-controller.js
            ├── methodology/context-resolver.js
            ├── methodology/protocols.js
            ├── methodology/engine.js
            ├── methodology/aipe.js
            ├── knowledge/library.js
            ├── models/checklists.js
            └── ui/
                ├── app.js
                ├── workflow.js
                ├── surface-controller.js
                ├── inspector-controller.js
                ├── method-context-controller.js
                └── dialog-controller.js
```

A aplicação continua um PWA estático. Backend e banco remoto não são parte do runtime público atual.

---

## 5. Estado e persistência

### 5.1 Ownership

`js/core/store.js` é responsável por:

- leitura;
- migração;
- normalização;
- compatibilidade entre campos legados e canônicos;
- persistência em `localStorage`;
- assinatura de alterações;
- atualização silenciosa durante digitação;
- notificação controlada.

`js/core/case-lifecycle.js` mantém andamento, conclusão, lixeira e restauração, sem possuir persistência própria.

### 5.2 Compatibilidade

Chaves reconhecidas:

```text
medper.state.v4
medper.state.v3
medper.state.v2
mlks.prototype.v1
```

O objeto pericial canônico permanece em:

```text
methodology.general.object
```

`scope` continua como alias de compatibilidade durante a transição.

---

## 6. Modelo contextual canônico

O schema preserva labels históricos e acrescenta IDs estáveis:

```text
context
├── setting / settingId
├── legalSphere / legalSphereId
├── role / roleId
├── purposeId
├── matter / matterId
├── tribunal
├── unit
├── feeRegime
└── mode
```

Exemplo:

```text
setting       = Judicial
settingId     = judicial
legalSphere   = Cível
legalSphereId = civil
role          = Perita do juízo
roleId        = court_expert
matter        = Dano estético
matterId      = aesthetic_damage
```

Os campos legados `sphere` e `branch` continuam preservados para compatibilidade. A especificação integral está em `docs/CONTEXT_MODEL.md`.

---

## 7. Motor metodológico

### 7.1 Método geral e protocolos-base

`js/methodology/protocols.js` mantém:

- método geral;
- perguntas estruturadas/narrativas;
- protocolos-base por IDs estáveis (`aesthetic`, `capacity`, `causation`, `liability`);
- fallback genérico;
- compatibilidade com labels históricos.

Esses protocolos-base não são suficientes, isoladamente, para expressar todo o contexto jurídico-pericial.

### 7.2 Resolução contextual

`js/methodology/context-resolver.js` é a camada entre o contexto do caso e o método específico.

Responsabilidades:

- resolver/sugerir finalidade;
- identificar perfil contextual;
- declarar prioridades e cautelas;
- separar perfil contextual de protocolo-base;
- sugerir instrumentos auxiliares;
- preservar escolha médica explícita.

Perfis iniciais:

```text
civil + aesthetic_damage
→ aesthetic_damage_civil
→ base aesthetic
→ AIPE sugerida como instrumento possível

criminal + aesthetic_damage
→ aesthetic_damage_criminal
→ base aesthetic
→ AIPE não sugerida por padrão

labor + capacity
→ capacity_labor
→ base capacity

social_security + capacity
→ capacity_social_security
→ base capacity
```

Combinações não validadas recebem perfil genérico. O sistema não inventa regras contextuais.

### 7.3 Protocolos × instrumentos

Controles separados:

```text
methodology.activeProtocolIds
methodology.dismissedProtocolIds
methodology.activeInstrumentIds
methodology.dismissedInstrumentIds
```

Isso impede que uma escala auxiliar seja confundida com protocolo ou conclusão.

### 7.4 Audit engine

`js/methodology/engine.js` executa:

- bloqueios e ressalvas;
- completude;
- salvaguardas por protocolo;
- verificação contextual de instrumentos.

No dano estético, AIPE só gera a salvaguarda de fundamentação quando está ativa para o contexto. Se houver registro AIPE sem instrumento ativo, o motor produz ressalva para revisão da pertinência.

Cada pendência emitida declara o campo que a originou (`{severity, field, text}`). É procedência, não classificação: severidade, redação e condição continuam decididas apenas aqui. A interface usa esse identificador para saber em qual etapa a resposta é registrada, sem reinterpretar o significado metodológico da pendência — o mapa campo→etapa vive em `js/ui/workflow.js` e nenhuma pendência deixa de existir por causa dele.

---

## 8. Knowledge layer

`js/knowledge/library.js` permanece declarativa e separada do motor decisório.

Ela contém provenance e governança de fontes, incluindo natureza, autoridade, versão, âmbito, tema, localizador, finalidade e limitações.

Referência não vira regra automaticamente.

---

## 9. Interface e superfícies

### 9.1 Superfícies

- Dashboard — localizar e priorizar;
- Meus casos — gerir lifecycle e casos;
- Agenda e prazos — gerir temporalidade;
- Referências — consultar conhecimento;
- Inspector — reconhecer rapidamente um caso;
- Workspace — executar raciocínio médico-pericial.

### 9.2 Workspace

`js/ui/workflow.js` preserva nove etapas cognitivas:

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

Também mantém o roteamento das pendências da auditoria por etapa (`stageForAuditField`): em qual tela a médica registra a resposta de cada uma. É decisão de interface — o padrão é `Exame e método`, a tela que renderiza método geral e protocolos por inteiro. A tela de cada etapa põe em primeiro plano as pendências que ali se resolvem, declara em texto o total de bloqueios e ressalvas do caso e mantém a lista integral a um clique.

### 9.3 Contexto metodológico na UI

`js/ui/method-context-controller.js` acrescenta à etapa `Exame e método` uma camada visual sem assumir persistência própria.

Exibe:

- finalidade;
- perfil contextual;
- papel profissional;
- prioridades e cautelas;
- instrumentos auxiliares;
- aceitação/rejeição explícitas.

A sugestão contextual não é silenciosamente convertida em decisão médica.

`js/ui/app.js` permanece responsável pelo workspace e pelos formulários existentes. A decomposição continua incremental.

---

## 10. PWA

`sw.js` utiliza:

- precache do shell;
- network-first para HTML/CSS/JS;
- limpeza de caches antigos;
- fallback separado entre landing e aplicação.

O shell inclui `context-resolver.js`, `method-context-controller.js` e `context-methodology.css`.

---

## 11. Fronteiras de responsabilidade

| Módulo | Responsabilidade | Não deve assumir |
|---|---|---|
| `main.js` | composição | regras periciais |
| `store.js` | estado/migração/persistência | renderização |
| `context-resolver.js` | enquadramento metodológico contextual | conclusão jurídica |
| `protocols.js` | método geral e protocolos-base | DOM |
| `engine.js` | audit/completude/salvaguardas, com procedência de campo | apresentação, ordem de exibição |
| `ui/workflow.js` | etapas cognitivas e roteamento de pendências por etapa | severidade, redação ou condição de pendência |
| `aipe.js` | referência declarativa AIPE | decisão/pontuação automática |
| `knowledge/library.js` | provenance e pertinência documental | alterar método |
| `models/checklists.js` | checklist declarativo de conferência de laudo | assumir motor decisório, produzir pontuação ou avaliar mérito clínico |
| `method-context-controller.js` | apresentar contexto e registrar escolha explícita | persistência direta |
| `ui/app.js` | workspace/interação | `localStorage` direto, redesenho que não notifique os demais assinantes |
| `sw.js` | cache/offline | autorização/dados |

---

## 12. Testes e evidência

A suíte automatizada cobre atualmente, entre outros:

- migração e compatibilidade de store;
- contexto operacional;
- IDs contextuais estáveis;
- diferenciação cível/criminal em dano estético;
- AIPE contextual;
- aceitação/rejeição explícita de instrumentos;
- lifecycle;
- dashboard e superfícies;
- design system/brand;
- inspector;
- knowledge layer;
- metodologia;
- PWA/entrypoints.

Auditoria específica da resolução contextual: `docs/AUDIT_CONTEXTUAL_METHODOLOGY_2026-08-08.md`.

---

## 13. Limites atuais

- o protótipo público não deve receber dados reais sensíveis;
- algumas telas de criação ainda exibem labels históricos (`sphere/branch`), embora o store normalize para campos/IDs canônicos;
- nem toda combinação esfera × objeto possui perfil validado;
- backend FastAPI e schema Supabase ainda precisam de decisão arquitetural canônica antes da sincronização remota;
- segurança multiusuário ainda não está operacional ponta a ponta.

---

## 14. Arquitetura futura

Antes da produção serão necessários:

- autenticação real;
- persistência remota canônica;
- RLS/isolamento validado;
- storage seguro de arquivos;
- auditoria server-side;
- backups/restauração;
- observabilidade;
- gestão de incidentes;
- governança LGPD;
- sincronização offline/versionada.

Essas etapas não devem ser misturadas com alterações metodológicas ou visuais sem gates próprios.
