# MedPer — mapa canônico de produto e navegação

Data: 2026-08-08
Status: fonte de verdade de arquitetura de informação durante a Fase 2
Deriva permitida: nenhuma sem atualização deliberada de `docs/PRODUCT_ANCHOR.md`, deste mapa e dos testes correspondentes.

## 1. Regra estrutural

O MedPer não é uma única página longa com atalhos por rolagem. As áreas operacionais abaixo são **visões distintas**, ainda que compartilhem o mesmo shell visual e a mesma entrada `app.html`.

```text
SITE PÚBLICO
/
└── apresentação institucional

APLICAÇÃO
/app.html
├── autenticação / modo local
└── shell autenticado/local
    ├── Visão geral
    ├── Meus casos
    ├── Agenda e prazos
    ├── Referências técnicas
    ├── Modelos e checklists
    └── Configurações
```

A navegação primária muda a visão ativa. Não deve apenas executar `scrollIntoView`, mover o viewport para uma seção da Visão geral ou manter `Visão geral` marcada como ativa quando outra área foi selecionada.

## 2. Rotas conceituais

Enquanto a aplicação permanecer estática em GitHub Pages, as visões podem usar hash routing. A semântica abaixo é obrigatória mesmo que a implementação técnica futura mude.

```text
/app.html#/overview
/app.html#/cases
/app.html#/agenda
/app.html#/references
/app.html#/models
/app.html#/settings
/app.html#/case/:caseId/:stage
```

Rotas legadas de workspace podem continuar sendo resolvidas por compatibilidade, mas não definem a arquitetura nova.

## 3. Visão geral

Finalidade: orientar a próxima ação e resumir carga operacional.

Conteúdo autorizado:

- saudação/contexto profissional;
- busca global;
- um único CTA `Nova perícia`;
- acessos rápidos a `Meus casos`, `Agenda e prazos` e `Referências técnicas`;
- `Continuar trabalhando`;
- `Próximos prazos`;
- pendências relevantes.

Conteúdo que **não pertence** à Visão geral:

- catálogo completo de todos os casos;
- filtros completos de lifecycle;
- biblioteca técnica expandida;
- formulários metodológicos;
- AIPE completa;
- configurações de conta.

## 4. Meus casos

Finalidade: localizar, comparar, filtrar e operar perícias.

Dimensões independentes obrigatórias:

- esfera/contexto jurídico-pericial;
- papel profissional;
- tribunal/órgão;
- unidade/vara;
- regime de honorários;
- objeto/matéria;
- status do lifecycle.

A visão deve ser densa e escaneável. `AJG`/particular permanece atributo ou filtro secundário, nunca categoria principal. Casos judiciais devem favorecer localização por Tribunal/Unidade/Vara.

Selecionar um caso pode abrir o Inspector contextual. `Abrir perícia` entra no Workspace.

## 5. Agenda e prazos

Finalidade: administrar dimensão temporal transversal dos casos.

Deve possuir visão própria, com ordenação temporal e vínculo explícito ao caso. Criticidade é semântica e discreta:

- normal: neutro/azul institucional;
- atenção: âmbar;
- crítico/atrasado: vermelho/coral em microindicadores/texto.

Não pintar cards inteiros como mecanismo principal de criticidade.

## 6. Referências técnicas

Finalidade: consultar e auditar conhecimento sem transformar literatura em regra decisória.

Cada referência preserva natureza/classe, autoridade, versão/data, âmbito, tema, localizador, finalidade, força e limitação quando aplicável.

A Biblioteca é uma superfície própria. No Workspace, referências pertinentes aparecem secundariamente e por progressive disclosure.

## 7. Modelos e checklists

Finalidade: reunir instrumentos de apoio reutilizáveis sem confundi-los com método obrigatório.

Modelos e checklists não podem alterar silenciosamente o motor metodológico nem gerar conclusão automática.

## 8. Configurações

Finalidade: perfil, conta e preferências da aplicação.

Detalhes de infraestrutura, segredos, `service_role`, configuração interna do Supabase ou instruções de desenvolvimento não pertencem à UX do usuário final.

## 9. Inspector contextual

O Inspector é uma camada contextual, não uma rota primária nem um mini-workspace.

Estrutura canônica:

```text
Resumo | Referências | Atividade
```

Deve responder em segundos:

1. que caso é este;
2. onde está;
3. o que falta;
4. qual é o próximo prazo;
5. quais referências estão vinculadas;
6. se a usuária quer abrir o Workspace.

CTA inequívoco: `Abrir perícia`.

## 10. Workspace do caso

Rota conceitual:

```text
/app.html#/case/:caseId/:stage
```

Nove etapas cognitivas, na ordem:

1. Delimitação
2. Autos e evidências
3. Cronologia
4. Hipóteses e diligências
5. Exame e método
6. Fundamentação
7. Conclusão
8. Quesitos
9. Documento

O contexto jurídico-pericial é resolvido antes do objeto e o objeto antes dos métodos/instrumentos aplicáveis.

## 11. Dano estético e AIPE

AIPE **não é item do menu global**. É instrumento específico disponibilizado dentro do Workspace quando o objeto/contexto pertinente for dano estético e a metodologia aplicável estiver validada.

Fluxo conceitual:

```text
Contexto jurídico-pericial
→ objeto: dano estético
→ Exame e método
→ protocolo de dano estético
→ descrição morfológica / fotografia / consolidação / limitações
→ AIPE, quando pertinente
→ fundamentação
→ conclusão humana
```

Regras permanentes:

- AIPE não produz conclusão automática;
- categorias, quadros e faixas dependem da fonte-mãe validada;
- UI, domínio e auditoria devem usar a mesma taxonomia;
- ausência de consolidação impede conclusão estética permanente definitiva.

## 12. Marca e shell visual — invariantes

A referência visual aprovada é contrato de produto, não inspiração livre.

- logomark: geometria facetada vertical aprovada; não redesenhar por aproximação;
- wordmark: `Med` marfim/branco quente + `Per` azul-celeste institucional;
- sidebar/shell: azul institucional em profundidade, com textura/estrutura facetada tridimensional **sutil** do mockup aprovado;
- fundo principal: muito claro, sóbrio;
- multicores do logomark: restritas à marca e microdetalhes deliberados;
- coral/vermelho: prioritariamente semântico;
- iconografia: linear/editorial, sem emoji, clipart ou 3D genérico;
- títulos serifados podem criar hierarquia editorial, mas não devem produzir aparência de template de IA.

### Bloqueio de asset

A imagem/mockup de referência e o arquivo-fonte da geometria final da marca precisam existir versionados no repositório. Enquanto isso não ocorrer, `icon.svg` deve ser tratado como **implementação provisória**, não como prova de fidelidade à marca.

Nenhum agente deve inventar uma nova geometria para “aproximar” a logo.

## 13. Responsividade

Responsividade não pode destruir a identidade nem transformar a navegação em outra arquitetura.

- desktop: sidebar canônica persistente;
- larguras intermediárias: preservar hierarquia e navegação sem converter automaticamente todas as visões em uma página longa;
- mobile real: adaptação deliberada e testada, mantendo estado ativo correto;
- textura/estrutura visual do shell não deve desaparecer incidentalmente em breakpoints que ainda representam uso desktop/tablet horizontal.

Breakpoints são decisão de experiência e exigem teste visual, não apenas media query sintática.

## 14. Critério de aceite de navegação

Uma visão só é considerada implementada quando:

1. possui estado/rota própria;
2. o item correto aparece ativo;
3. recarregar preserva a visão;
4. voltar/avançar do navegador funciona quando aplicável;
5. não depende de rolar para uma seção escondida da Visão geral;
6. testes automatizados cobrem a semântica da rota;
7. teste manual confirma comportamento desktop e mobile.
