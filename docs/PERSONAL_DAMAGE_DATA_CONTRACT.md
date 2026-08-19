# Contrato de Dados — Dano Pessoal

## Finalidade

Este documento fixa os identificadores estáveis que o frontend, o store local e o backend futuro devem compartilhar para o módulo de dano pessoal/corporal. A regra médico-pericial permanece em `js/methodology/personal-damage.js`; persistência e sincronização não devem reimplementar a lógica de decisão.

## Princípio de armazenamento

Na fase atual, o estado estruturado permanece dentro de `case.methodology` e pode ser persistido como JSON. O schema Supabase já prevê `cases.payload jsonb`; portanto, não é necessário criar uma coluna SQL para cada constructo antes de estabilizar o domínio.

```text
case
└── methodology
    ├── guided     respostas estruturadas / estados canônicos da UI
    └── specific   fundamentações narrativas, fontes, valorações e limitações
```

O backend deve armazenar, versionar, autorizar e auditar esse payload. Ele não deve recalcular culpa, indenização ou escore global.

## Gates

### `methodology.guided`

- `personalDamageDamageStatus`
- `personalDamageCausalStatus`
- `personalDamageConsolidationStatus`

### `methodology.specific`

- `personalDamageDamageBasis`
- `personalDamageCausalBasis`
- `personalDamageConsolidationBasis`

Os estados causais internos do motor são:

- `supported`
- `indeterminate`
- `excluded`
- `not_assessed`

A interface pode exibir rótulos em português; o motor é responsável pela normalização. `indeterminate` nunca pode ser convertido silenciosamente em `excluded`.

## Temporários

### Narrativas estruturadas

- `temporaryFunctionalTotal`
- `temporaryFunctionalPartial`
- `temporaryProfessional`
- `quantumDolorisSummary`
- `temporaryEvidence`

Datas e intervalos poderão ganhar estrutura própria quando o backend de cronologia for conectado. Até lá, a migração deve preservar integralmente as narrativas legadas.

## Eixos permanentes

### `methodology.guided`

- `permanentFunctionalStatus`
- `permanentAestheticStatus`
- `permanentProfessionalStatus`
- `permanentLeisureStatus`
- `permanentSocialStatus`
- `permanentSexualStatus`
- `thirdPartyDependenceStatus`
- `scarQualityStatus`

Estados canônicos dos eixos:

- `demonstrated`
- `not_demonstrated`
- `indeterminate`
- `not_applicable`

## Eixo funcional

### `methodology.specific`

- `functionalSequelae`
- `functionalReference`
- `functionalValuation`
- `functionalCombination`

`functionalCombination` registra a regra aplicada; Balthazard não é presumido. A causa do trauma não seleciona barema automaticamente.

## Eixo estético e qualidade cicatricial

### `methodology.specific`

- `aestheticDescription`
- `aestheticReference`
- `aestheticValuation`
- `scarQualityReference`

AIPE e POSAS permanecem instrumentos distintos. O backend não deve inferir um a partir do outro.

## Repercussões permanentes

### `methodology.specific`

- `professionalRepercussionBasis`
- `leisureRepercussionBasis`
- `socialRepercussionBasis`
- `sexualRepercussionBasis`
- `thirdPartyDependenceBasis`

Sem método/referencial de graduação aplicável, o sistema deve aceitar conclusão qualitativa fundamentada e não exigir número.

## Integração

### `methodology.specific`

- `personalDamageLimitations`
- `personalDamageSynthesis`

Não criar campos como:

- `totalDamage`
- `globalPercentage`
- `overallDamage`
- `responsibilityPercentage`
- `indemnityValue`

Os constructos são persistidos e apresentados por eixo.

## Rastreabilidade futura

Quando o backend for conectado, cada alteração relevante deverá poder registrar:

- `case_id`
- usuário responsável
- timestamp
- campo/identificador alterado
- valor anterior e novo valor quando adequado
- origem da alteração (manual/importação/migração)
- versão do método

A trilha de auditoria não substitui o registro da fonte médico-pericial dentro do próprio caso.

## Compatibilidade

A sincronização inicial deve preservar o payload completo do caso. Migrações futuras podem promover campos específicos a tabelas relacionais apenas quando houver necessidade demonstrada de consulta, indexação, colaboração ou auditoria granular. A promoção nunca deve apagar o JSON original sem migração verificável.