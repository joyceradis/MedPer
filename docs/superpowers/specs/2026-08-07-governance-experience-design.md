# MedPer — Fase 2: governança e experiência

Data: 2026-08-07
Branch: `phase2-governance-experience`
Baseline: `d182325`

## 1. Objetivo

Organizar o MedPer como produto médico-pericial maduro sem alterar, nesta etapa, sua identidade visual definitiva. O trabalho desta fase cobre duas frentes:

1. **Governança** — transformar achados, riscos e decisões em memória institucional versionada no repositório.
2. **Experiência** — redesenhar dashboard, workspace, referências contextuais e lifecycle para refletir o modelo mental da prática pericial.

A fase não inclui naming, logo, paleta final, favicon definitivo ou tipografia final.

## 2. Princípios de produto

- O sistema deve refletir o **trabalho pericial**, não a estrutura interna do código.
- A perita deve saber rapidamente: onde está, qual é o papel profissional, qual é o caso, qual etapa cognitiva está aberta e qual é o próximo passo.
- Conteúdo técnico serve como **apoio contextual** e nunca deve competir visualmente com a tarefa principal.
- Sugestões não equivalem a decisões.
- A interface pode mudar sem alterar regras médico-periciais.
- Casos legados precisam permanecer íntegros.

## 3. Arquitetura de informação do caso

O caso passa a ser apresentado segundo dimensões distintas, sem confundir categorias de níveis diferentes:

- **Esfera**: judicial, administrativa, previdenciária, ético-profissional, extrajudicial etc.
- **Papel profissional**: perita do juízo, assistente técnica, parecerista, outro.
- **Tribunal/órgão**: ex. TJES.
- **Unidade/Vara**: ex. 1ª Vara Cível de Vila Velha.
- **Regime de honorários**: AJG, particular, institucional/outro.
- **Matéria**: dano estético, incapacidade, nexo etc.
- **Status**: em andamento, concluída, lixeira.

Essas dimensões devem permanecer independentes no domínio e ser combináveis por filtros na interface.

## 4. Dashboard

### 4.1 Estrutura

O dashboard deve ter quatro camadas, nesta ordem:

1. **Contexto profissional** — Todos, Perita do juízo, Assistência técnica, Pareceres.
2. **Filtros operacionais** — Tribunal/órgão, Vara/unidade, regime, matéria e status.
3. **Agrupamento** — preferencialmente por Tribunal/Vara quando o contexto for judicial.
4. **Casos** — lista densa e escaneável.

### 4.2 Card/list item

Cada caso deve priorizar:

- título;
- referência/processo;
- Vara/unidade;
- papel profissional;
- regime de honorários;
- matéria;
- status.

A área principal abre o caso. Ações de lifecycle ficam acessíveis sem menu intermediário:

- concluir/reabrir;
- mover para lixeira.

Exclusão definitiva continua disponível somente dentro da lixeira e exige confirmação explícita.

### 4.3 Hierarquia de ações

Deve existir apenas um CTA primário `Nova perícia` por contexto visual. A duplicidade atual deve desaparecer.

## 5. Workspace do caso

### 5.1 Estrutura permanente

O workspace mantém as nove etapas cognitivas:

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

A navegação deve indicar claramente a etapa atual, sem apresentar a própria navegação como protagonista visual.

### 5.2 Cabeçalho do caso

O cabeçalho precisa informar de forma compacta:

- título;
- referência;
- papel profissional;
- Vara/unidade ou órgão;
- matéria;
- status.

Ações secundárias ficam agrupadas em uma área própria, sem competir com a tarefa cognitiva.

## 6. Referências contextuais

### 6.1 Papel

A knowledge layer permanece fora do motor decisório. Sua função é **consulta e conferência**, nunca condução automática.

### 6.2 Apresentação

A apresentação atual — ficha bibliográfica expandida no fluxo principal — deve ser substituída por disclosure progressivo.

Comportamento desejado:

- a etapa informa discretamente que existem referências pertinentes;
- a usuária vê inicialmente título curto, natureza/classe e localizador;
- detalhes de autoridade, versão, âmbito, finalidade e limitação aparecem sob demanda;
- divergências recebem sinalização própria;
- acesso a `ver todas as referências` fica disponível sem ocupar a área central da tarefa.

### 6.3 Regra de prioridade

O conteúdo da etapa sempre tem maior prioridade visual que a referência contextual.

## 7. Lifecycle

Estados válidos:

- `Em andamento`
- `Concluída`
- `Lixeira`

Regras:

- concluir não apaga nem bloqueia reabertura;
- mover para lixeira registra o status anterior;
- restaurar recupera o status anterior quando possível;
- exclusão definitiva só existe na lixeira;
- ações precisam ser claras, reversíveis quando apropriado e testáveis.

## 8. Compatibilidade e dados

Esta fase não altera deliberadamente o formato exportado dos casos. Mudanças de UI devem usar os campos existentes sempre que possível.

Se algum novo atributo de domínio for necessário, a implementação deve:

1. definir default seguro;
2. normalizar casos legados;
3. preservar exportação/importação;
4. adicionar teste de regressão.

## 9. Limites metodológicos

Esta fase não deve:

- reescrever AIPE;
- alterar pontuações;
- alterar bloqueios do `engine.js` sem issue/achado correspondente;
- transformar referência em regra;
- ativar protocolo apenas porque ele foi sugerido;
- modificar o método para acomodar preferências de layout.

## 10. Testes e critérios de aceite

### Dashboard

- localizar um caso judicial por Vara sem abrir cards individualmente;
- filtrar por papel profissional, regime e matéria;
- concluir/reabrir sem navegação desnecessária;
- mover para lixeira diretamente;
- não existir CTA duplicado.

### Workspace

- nove etapas permanecem navegáveis;
- etapa atual é inequívoca;
- referências não encobrem a tarefa principal;
- detalhes bibliográficos continuam acessíveis;
- nenhuma alteração de UI modifica conclusão ou protocolo automaticamente.

### Persistência

- casos v2/v3/v4 continuam migrando;
- JSON exportado continua carregável;
- lifecycle e objeto pericial permanecem preservados.

### Qualidade

- `npm run audit` deve passar;
- novos cenários de dashboard/lifecycle/referências recebem testes quando testáveis em unidade/DOM;
- validação manual em desktop antes de merge;
- mobile fica como gate posterior desta mesma fase, não como requisito para iniciar implementação.

## 11. Fora de escopo

- naming definitivo;
- logo;
- favicon final;
- paleta definitiva;
- tipografia definitiva;
- OAuth/Workspace;
- Supabase real;
- cobrança;
- onboarding comercial.

## 12. Estratégia de implementação recomendada

A abordagem preferida é **incremental e preservadora**, não uma reescrita completa:

1. consolidar governança;
2. separar dados de filtro/agrupamento da renderização atual;
3. redesenhar dashboard sobre o mesmo store;
4. ajustar lifecycle e ações diretas;
5. reduzir peso visual da knowledge layer sem alterar seu domínio;
6. reorganizar workspace mantendo as nove rotas;
7. executar regressão e validação manual;
8. só depois considerar merge.

Essa abordagem reduz risco sobre persistência, método e PWA e permite rollback por etapa.
