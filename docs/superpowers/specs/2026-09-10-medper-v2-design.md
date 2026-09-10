# MedPer V2 — Design de Produto e Arquitetura

## 1. Objetivo

O MedPer V2 será uma estação de trabalho médico-pericial local-first para conduzir um caso desde a abertura até o documento final, com rastreabilidade explícita entre fonte, fato, achado, interpretação e conclusão.

A V2 não será um gerador de laudos nem uma coleção de calculadoras. O documento final será consequência de um fluxo clínico-pericial estruturado.

## 2. Princípios de produto

1. **Caso como unidade central.** Toda ação ocorre dentro de um caso pericial identificável.
2. **Local-first.** O núcleo da aplicação deve abrir, persistir e funcionar sem backend, login ou rede.
3. **Sem duplicidade de entrada.** Informação registrada uma vez deve alimentar etapas subsequentes.
4. **Método contextual.** Instrumentos e protocolos aparecem apenas quando pertinentes ao contexto e objeto.
5. **Decisão médica preservada.** O sistema organiza e calcula; não substitui juízo médico-pericial.
6. **Rastreabilidade.** Conclusões relevantes devem poder ser vinculadas às evidências e achados que as sustentam.
7. **Gradual disclosure.** A interface mostra o necessário para a etapa atual e evita sobrecarga.
8. **Exportável.** O usuário deve poder gerar documento final e backup estruturado sem depender do servidor.
9. **Dados sensíveis por desenho.** O sistema não deve enviar dados médicos a serviços externos por padrão.

## 3. Escopo funcional da V2

### 3.1 Dashboard de casos

A tela inicial autenticada/local deve apresentar:

- casos recentes;
- busca por nome, número do processo e parte examinada;
- status: rascunho, em análise, perícia realizada, aguardando documentos, concluído, arquivado;
- prazo principal;
- pendências críticas;
- ação primária `Novo caso`.

O dashboard não deve competir com o fluxo do caso. Métricas e widgets secundários ficam fora do MVP.

### 3.2 Criação de caso

O assistente de criação deve capturar o mínimo necessário:

- título curto do caso;
- número do processo opcional;
- tribunal/vara ou origem;
- papel profissional: perita judicial, assistente técnica, parecerista ou outra avaliação médico-legal;
- esfera/contexto: cível, previdenciário, securitário, trabalhista, responsabilidade profissional ou outro;
- parte examinada;
- objeto pericial principal;
- data da perícia, se definida;
- prazo do laudo/parecer, se definido.

Ao salvar, o caso abre diretamente no workspace.

## 4. Workspace do caso

A aplicação principal terá três regiões.

### 4.1 Cabeçalho do caso

Persistente, compacto e contendo:

- título;
- processo;
- parte examinada;
- tipo/contexto;
- status;
- prazo;
- indicador de salvamento local.

### 4.2 Navegação lateral por etapas

Ordem padrão:

1. Resumo
2. Objeto e contexto
3. Autos e fontes
4. Cronologia
5. História e antecedentes
6. Exame pericial
7. Método e instrumentos
8. Análise médico-pericial
9. Quesitos
10. Conclusão
11. Documento final

A ordem deve ser orientadora, não rigidamente bloqueante. O usuário pode navegar entre etapas, mas o MedPer sinaliza lacunas.

### 4.3 Painel contextual

Painel lateral opcional, aberto apenas quando útil, para:

- pendências;
- inconsistências;
- instrumentos aplicáveis;
- memória de cálculo;
- evidências vinculadas;
- notas técnicas e limitações.

Não será um chat de IA no MVP.

## 5. Modelo de domínio

O V2 deverá introduzir um modelo canônico de `CaseRecord`, em vez de cada módulo manter estruturas paralelas.

Estrutura conceitual mínima:

```text
CaseRecord
├── identity
├── context
├── examinedPerson
├── deadlines
├── sources[]
├── timeline[]
├── history
├── examination
├── methodology
├── evidenceClaims[]
├── questions[]
├── analysis
├── conclusion
├── document
└── metadata
```

### 5.1 Source

Representa qualquer fonte utilizada:

- documento dos autos;
- prontuário;
- laudo prévio;
- imagem/fotografia;
- relato da parte;
- exame complementar;
- literatura ou norma técnica.

Campos essenciais: id, tipo, título, data, origem, observações, referência de arquivo opcional.

### 5.2 TimelineEvent

Evento cronológico vinculado opcionalmente a uma ou mais fontes.

Campos: data ou intervalo, título, descrição factual, sourceIds, grau de certeza.

### 5.3 EvidenceClaim

Elemento central de rastreabilidade:

```text
fonte(s) -> fato/achado -> interpretação -> impacto na conclusão
```

Cada claim terá:

- id;
- sourceIds;
- statement factual;
- finding opcional;
- interpretation;
- conclusionTags;
- limitations;
- confidence: documentado, compatível, provável, possível, não sustentado.

O sistema não deve inferir automaticamente um nível de certeza médico-legal sem ação explícita do usuário.

## 6. Contexto e roteamento metodológico

A V2 reaproveitará, após validação, os motores existentes de contexto, AIPE, POSAS, dano pessoal, dano temporário, cálculo funcional, baremas, incapacidade e nexo.

O roteador deve receber o contexto do caso e o objeto e retornar uma lista de módulos pertinentes.

Exemplos:

- `dano estético` -> descrição morfológica + documentação fotográfica + AIPE + POSAS quando aplicável;
- `incapacidade` -> função + atividade habitual + capacidade residual + temporalidade + prognóstico;
- `nexo causal` -> temporalidade + mecanismo + plausibilidade + estado anterior + concausas + alternativas;
- `responsabilidade profissional` -> indicação + dever técnico + conduta + evolução + dano + evitabilidade + nexo;
- `dano corporal` -> dano temporário + sequelas permanentes + dano funcional + dano estético + repercussões pertinentes.

Instrumentos não pertinentes permanecem ocultos.

## 7. Autos e arquivos

### 7.1 MVP local

A aplicação deve permitir cadastrar fontes e metadados mesmo sem upload real de arquivo.

Quando o navegador suportar File System Access / IndexedDB, anexos locais podem ser persistidos de forma opcional, mas a V2 não dependerá disso para funcionar.

### 7.2 Backend futuro

O backend será um adaptador opcional para:

- sincronização multi-dispositivo;
- armazenamento cifrado de anexos;
- organizações/equipes;
- auditoria remota.

A ausência do backend jamais deve bloquear abertura ou edição do caso local.

## 8. Persistência

### 8.1 Repositório local

Criar uma interface única:

```js
CaseRepository
  list()
  get(id)
  create(input)
  save(caseRecord)
  remove(id)
  export(id)
  import(payload)
```

A implementação padrão será IndexedDB com fallback controlado para localStorage apenas se necessário.

### 8.2 Versionamento de schema

Cada registro deverá conter `schemaVersion`.

Migrações devem ser explícitas e testáveis, por exemplo:

```text
v1 -> v2 -> v3
```

Nunca alterar silenciosamente o formato persistido sem migrador.

### 8.3 Sync opcional

O sincronizador remoto implementará a mesma fronteira de dados, sem contaminar componentes de UI.

Conflitos devem preservar a cópia local e exigir resolução explícita; nenhuma versão deve ser sobrescrita silenciosamente.

## 9. Exame pericial

O exame será composto por:

- estado geral e dados relevantes;
- exame dirigido ao objeto;
- achados positivos;
- achados negativos pertinentes;
- mensurações;
- limitações do exame;
- documentação fotográfica quando pertinente.

O formulário será dinâmico conforme objeto e metodologia, evitando uma ficha clínica genérica excessiva.

## 10. Análise médico-pericial

Esta etapa deve ser uma matriz estruturada, não apenas um textarea.

Blocos:

- questão médico-legal;
- evidências favoráveis;
- evidências contrárias;
- estado anterior;
- hipóteses alternativas;
- limitações documentais/exame;
- síntese argumentativa.

Cada item pode referenciar `EvidenceClaim` e fontes.

A síntese final pode ser texto livre, mas deve permanecer auditável pelos vínculos estruturados.

## 11. Quesitos

Cada quesito terá:

- número/ordem;
- autor/origem;
- texto original;
- resposta;
- fundamentação curta opcional;
- links para evidências/claims;
- status respondido/pendente/não aplicável.

O documento final deve usar exatamente o texto registrado, sem reescrever o quesito automaticamente.

## 12. Conclusão

A conclusão deverá ser deliberadamente separada da análise.

Campos estruturados variam por contexto, mas toda conclusão deve suportar:

- conclusão principal;
- grau de sustentação;
- condicionantes;
- limitações;
- ressalvas;
- itens que não podem ser concluídos pelos elementos disponíveis.

A interface deve alertar quando a conclusão contém proposições sem evidência vinculada, mas não bloquear o usuário.

## 13. Documento final

### 13.1 Compositor

O documento será composto a partir do `CaseRecord`, com seções selecionáveis:

- identificação;
- objeto;
- metodologia;
- elementos analisados;
- histórico/cronologia pertinente;
- exame;
- discussão;
- conclusão;
- respostas aos quesitos;
- referências/anexos quando cabível.

### 13.2 Saídas do MVP

- pré-visualização imprimível A4;
- impressão/PDF via navegador;
- exportação `.json` completa do caso como backup.

DOCX programático fica fora do primeiro corte se exigir dependência nova pesada; poderá ser fase subsequente.

## 14. Interface e design system

A V2 manterá a identidade MedPer, mas eliminará a atual fragmentação de CSS.

Diretrizes:

- desktop-first, responsivo para tablet;
- densidade informacional profissional;
- tipografia legível em uso prolongado;
- navegação previsível;
- sem cards decorativos em excesso;
- estados de foco e teclado completos;
- labels sempre visíveis nos campos clínicos/periciais;
- cores nunca como único portador de significado;
- impressão A4 tratada como superfície própria.

## 15. Arquitetura de código

A V2 será implementada em módulos ES nativos, sem framework novo no primeiro corte.

Estrutura proposta:

```text
js/v2/
├── domain/
│   ├── case-record.js
│   ├── evidence-claim.js
│   ├── validators.js
│   └── migrations.js
├── repository/
│   ├── case-repository.js
│   └── indexeddb-case-repository.js
├── methodology/
│   ├── router.js
│   └── legacy-adapters.js
├── application/
│   ├── case-service.js
│   ├── document-service.js
│   └── export-service.js
├── ui/
│   ├── shell.js
│   ├── dashboard.js
│   ├── case-workspace.js
│   ├── contextual-panel.js
│   └── sections/
│       ├── summary-section.js
│       ├── context-section.js
│       ├── sources-section.js
│       ├── timeline-section.js
│       ├── history-section.js
│       ├── examination-section.js
│       ├── methodology-section.js
│       ├── analysis-section.js
│       ├── questions-section.js
│       ├── conclusion-section.js
│       └── document-section.js
└── main.js
```

CSS:

```text
css/v2/
├── tokens.css
├── shell.css
├── workspace.css
├── forms.css
├── methodology.css
└── print.css
```

O código legado permanece disponível durante a construção, mas a V2 não deve importar diretamente componentes de UI legados. Apenas motores de domínio validados podem ser adaptados.

## 16. Fronteira com legado

Classificação dos componentes existentes:

### Reaproveitar após testes

- metodologia/context resolver;
- AIPE;
- POSAS;
- barema routing;
- personal damage;
- bodily damage protocol;
- temporary damages;
- functional calc;
- knowledge/library quando for conteúdo técnico estático útil.

### Adaptar

- store atual, apenas como fonte para migração de dados;
- case lifecycle;
- exportações úteis;
- modelos/checklists.

### Não carregar para a nova UI

- controllers de superfície legados;
- dashboards legados;
- auth como requisito de boot;
- sincronização como requisito de funcionamento;
- CSS `phase2.css` como base da V2.

## 17. Segurança e privacidade

- Sem telemetria por padrão.
- Sem transmissão externa de dados clínicos por padrão.
- Sem API de IA embutida no MVP.
- Exportação de caso deve avisar que o arquivo pode conter dados sensíveis.
- O backend futuro deve ser opt-in e autenticado.
- Conteúdo HTML fornecido pelo usuário deve ser tratado como texto e escapado.
- Nenhum dado clínico deve ser incluído em logs de console em produção.

## 18. Estratégia de migração

A V2 coexistirá temporariamente com a V1 na branch de desenvolvimento.

Durante implementação:

- `app.html` continua apontando para V1 na `main`;
- a branch V2 ganha `v2.html` inicialmente;
- ao atingir critérios de aceite, `app.html` passa a carregar V2;
- V1 permanece acessível apenas por rota de legado durante um ciclo curto;
- dados V1 serão importados por migrador quando o formato for reconhecível.

Não haverá migração destrutiva automática.

## 19. Testes obrigatórios

### Domínio

- criação/validação de CaseRecord;
- migrações;
- roteamento metodológico;
- evidência e vínculos;
- cálculo dos instrumentos reaproveitados.

### Persistência

- create/get/list/save/remove;
- fechamento e reabertura do browser simulado;
- export/import round-trip;
- conflito de schema.

### Fluxo de produto

Cenário mínimo automatizado:

1. criar caso;
2. registrar contexto e objeto;
3. adicionar fonte;
4. criar evento cronológico;
5. registrar exame;
6. selecionar/aplicar método;
7. criar evidência vinculada;
8. responder quesito;
9. concluir;
10. abrir documento final;
11. exportar backup;
12. recarregar e confirmar persistência.

### Regressão

Os motores médico-periciais reaproveitados devem manter seus testes existentes ou ganhar adapters com testes equivalentes.

## 20. Critérios de aceite da primeira versão utilizável

A V2 só poderá substituir a aplicação principal quando:

1. abrir no GitHub Pages sem backend;
2. criar um caso novo sem erro;
3. persistir o caso após reload;
4. permitir navegar e editar todas as 11 etapas;
5. suportar ao menos dano estético, incapacidade e nexo causal com roteamento contextual;
6. AIPE e POSAS funcionarem dentro do caso, não como telas isoladas;
7. permitir cadastrar fontes e ligar pelo menos uma fonte a uma conclusão/interpretação;
8. responder quesitos;
9. gerar prévia A4 coerente;
10. exportar e reimportar o caso;
11. não exigir login, API ou internet após o shell estar carregado;
12. suíte V2 passar sem falhas;
13. nenhum dado de um caso aparecer em outro;
14. nenhum texto do usuário ser injetado como HTML não escapado.

## 21. Fora do MVP

Ficam deliberadamente fora do primeiro corte:

- cobrança;
- multiusuário/equipes;
- edição simultânea;
- OCR automático;
- extração automática de PDFs;
- IA generativa que escreva conclusões;
- assinatura digital;
- integração PJe;
- integração direta com prontuários;
- aplicativo nativo móvel;
- DOCX avançado, se exigir nova stack antes de o fluxo principal estar validado.

## 22. Resultado esperado

Ao abrir o MedPer V2, uma médica perita deve conseguir iniciar um caso, registrar os elementos relevantes, organizar os autos, construir a cronologia, documentar o exame, aplicar o método adequado ao objeto, sustentar a análise por evidências, responder quesitos e obter um documento final coerente — sem depender de backend e sem precisar entender a arquitetura interna do software.
