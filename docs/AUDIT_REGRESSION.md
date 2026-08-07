# Auditoria de regressão — MedPer

Data-base: 2026-08-06  
Estado auditado: `main`

## Objetivo

Preservar o funcionamento atual e os casos já armazenados antes de converter a interface para o fluxo cognitivo descrito em `docs/MEDPER_METHOD.md`.

## Regra de mudança

Nenhuma refatoração da fase 2 deve:

- apagar ou renomear dados sem migração;
- alterar valores usados pelo motor metodológico sem identificadores estáveis;
- introduzir um segundo proprietário de estado ou de `localStorage`;
- misturar o site público com a aplicação;
- aplicar AIPE fora do dano estético;
- conectar Supabase, Gemini ou cobrança durante a refatoração cognitiva;
- ser considerada concluída sem teste de regressão.

## Baseline funcional a preservar

1. Abertura da landing pública em `index.html`.
2. Abertura da aplicação em `app.html`.
3. Continuação em modo local.
4. Criação e cancelamento de nova perícia.
5. Abertura de caso existente.
6. Edição e persistência local sem reconstrução a cada caractere.
7. Cadastro de fonte, fato, evento e quesito.
8. Navegação entre as etapas.
9. Aplicação do protocolo correspondente à matéria.
10. Exportação do JSON.
11. Migração das chaves legadas de armazenamento.
12. Funcionamento offline sem troca entre landing e aplicação.

## Achados

### AR-01 — objeto pericial duplicado

**Risco:** alto.  
**Estado:** correção aplicada; testes adicionados.

O objeto existia em `case.scope` e `case.methodology.general.object`. A interface editava o primeiro e a auditoria metodológica exigia o segundo. Foi criada sincronização retrocompatível e migração durante a normalização.

### AR-02 — reconstrução integral durante digitação

**Risco:** alto.  
**Estado:** correção aplicada; testes de store adicionados; validação manual ainda pendente.

Campos narrativos agora atualizam e persistem o estado sem notificar os renderizadores a cada evento `input`. Ao finalizar a edição, o evento `change` emite a atualização para recalcular progresso, auditoria e documento. Respostas discretas, como radio buttons, continuam notificando imediatamente.

Essa divisão preserva o conteúdo digitado e evita perder foco, cursor ou seleção pela substituição integral do DOM em cada caractere.

### AR-03 — regras dependentes de rótulos textuais

**Risco:** alto.  
**Estado:** pendente.

O motor compara respostas por frases exibidas na interface. A fase 2 deve introduzir identificadores estáveis (`value`) separados dos rótulos (`label`) e migrar respostas antigas.

### AR-04 — arquivo de interface monolítico

**Risco:** médio-alto.  
**Estado:** pendente.

`js/ui/app.js` concentra renderização, roteamento, eventos, diálogos e mutações. A separação deve ocorrer por etapas e com testes, sem reescrita integral.

### AR-05 — cliente Supabase remoto sem versão exata

**Risco:** médio antes da conexão; alto em produção.  
**Estado:** não alterar nesta fase.

O import remoto usa a versão principal `@2`. Antes da etapa 3, o cliente deverá ser único, versionado e isolado da lógica de autenticação.

### AR-06 — políticas RLS ainda não testadas

**Risco:** crítico para produção; sem impacto no modo local atual.  
**Estado:** reservado para a etapa 5.

O schema contém políticas, mas elas não foram executadas contra usuários distintos. Não anunciar isolamento de dados como operacional antes dos testes de autorização.

### AR-07 — branches históricas obsoletas

**Risco:** médio.  
**Estado:** não mesclar.

As branches `frontend-pericial-audit-fixes`, `performance-improvements` e `refactor-modular-v4` estão atrás da `main` e não possuem commits exclusivos à frente.

## Política de persistência durante edição

- `input` em campos narrativos: persistir com `{ notify: false }`;
- `change` em campos narrativos: notificar renderizadores e recalcular indicadores;
- respostas de escolha: persistir e notificar imediatamente;
- qualquer atualização silenciosa continua sendo gravada em `medper.state.v4`;
- o store disponibiliza `notify()` para sincronização explícita sem nova mutação.

## Gates antes da fase 2

- [x] Testes de migração das chaves legadas.
- [x] Testes de sincronização do objeto pericial.
- [x] Auditoria automática de sintaxe e arquitetura.
- [x] Persistência silenciosa sem notificação de renderização.
- [ ] Teste manual de foco/cursor em campos extensos.
- [ ] Identificadores estáveis para respostas metodológicas.
- [ ] Matriz de compatibilidade entre dados atuais e novas etapas.
- [ ] Teste manual desktop.
- [ ] Teste manual mobile.
- [ ] Exportação e reimportação de caso real desidentificado.

## Política de merge

A fase 2 deverá ser desenvolvida em branch própria quando o conector confirmar a criação efetiva da referência. O merge só ocorrerá quando:

1. a suíte automática estiver verde;
2. o diff estiver limitado ao escopo declarado;
3. os dados legados forem preservados;
4. o teste manual obrigatório estiver documentado;
5. não houver mudança de Supabase, IA ou cobrança no mesmo conjunto de commits.
