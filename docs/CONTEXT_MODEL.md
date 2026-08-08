# MedPer — Modelo canônico de contexto médico-pericial

Data: 2026-08-08
Status: decisão arquitetural ativa

## 1. Princípio

O MedPer não seleciona um protocolo específico apenas porque uma matéria foi marcada como `Dano estético`, `Incapacidade`, `Nexo causal` ou outra.

A mesma matéria pode exigir perguntas, limites, linguagem conclusiva, evidências e instrumentos diferentes conforme o contexto da atuação, a esfera pertinente, a finalidade, o papel profissional e os quesitos.

**Regra canônica:**

> contexto da atuação → esfera/finalidade → papel e missão → objeto/quesitos → perfil contextual → protocolos e instrumentos possíveis → evidências/exame/análise → conclusão médica proporcional.

O sistema pode sugerir enquadramento e instrumentos. A decisão metodológica permanece do médico perito.

## 2. Problema legado corrigido

O schema histórico usava `context.sphere` para valores como `Judicial` e `context.branch` para valores como `Cível`, `Trabalhista` ou `Criminal`. Esses valores não pertencem ao mesmo nível semântico.

Para evitar quebra de dados, os campos antigos permanecem preservados, mas deixam de ser a referência conceitual principal.

## 3. Campos canônicos e IDs estáveis

```text
context
├── setting             rótulo do ambiente de atuação
├── settingId           identificador interno estável
├── legalSphere         rótulo da esfera/contexto jurídico-material
├── legalSphereId       identificador interno estável
├── role                rótulo do papel profissional
├── roleId              identificador interno estável
├── purposeId           finalidade explicitamente escolhida, quando houver
├── matter              rótulo do objeto/domínio médico-pericial
├── matterId            identificador interno estável
├── tribunal            tribunal/órgão
├── unit                vara/unidade
├── feeRegime           AJG/particular/outro
└── mode                modalidade da avaliação
```

Os labels visíveis podem evoluir sem alterar os IDs internos. Isso protege casos legados e evita que mudança de redação modifique a semântica dos dados.

Exemplos:

```text
Judicial       → settingId = judicial
Cível          → legalSphereId = civil
Criminal       → legalSphereId = criminal
Perita do juízo→ roleId = court_expert
Dano estético  → matterId = aesthetic_damage
Incapacidade   → matterId = capacity
```

## 4. Compatibilidade legada

Durante a transição:

```text
setting      ← context.setting || context.sphere
legalSphere  ← context.legalSphere || context.branch
```

Os campos `sphere` e `branch` não são apagados nem reescritos automaticamente.

A normalização acrescenta IDs canônicos quando reconhece labels históricos, sem eliminar os valores originais.

## 5. Finalidade: explícita ou sugerida

`purposeId` pode ser explicitamente definido pela médica. Quando não estiver preenchido, a camada de resolução pode **sugerir** uma finalidade compatível com a esfera, sem gravá-la como decisão jurídica automática.

Exemplos atualmente modelados:

```text
civil           → personal_damage_assessment
criminal        → medicolegal_assessment
labor           → occupational_medicolegal_assessment
social_security → social_security_assessment
```

A finalidade sugerida orienta perguntas e limites; não decide direito material.

## 6. Perfis contextuais

A camada `js/methodology/context-resolver.js` representa a ponte entre contexto e método.

Perfis inicialmente formalizados:

```text
civil + aesthetic_damage
→ aesthetic_damage_civil
→ base: aesthetic
→ AIPE: instrumento sugerido, não obrigatório

criminal + aesthetic_damage
→ aesthetic_damage_criminal
→ base: aesthetic
→ AIPE: não sugerida por padrão

labor + capacity
→ capacity_labor
→ base: capacity

social_security + capacity
→ capacity_social_security
→ base: capacity
```

Os perfis não substituem o núcleo metodológico. Eles acrescentam prioridades, cautelas e instrumentos possíveis conforme o contexto.

Combinações ainda não validadas permanecem em perfil genérico e devem usar método geral + seleção manual, em vez de receber regra inventada.

## 7. Instrumentos auxiliares

Instrumento não é sinônimo de protocolo nem de conclusão.

A metodologia distingue:

```text
methodology.activeProtocolIds
methodology.dismissedProtocolIds
methodology.activeInstrumentIds
methodology.dismissedInstrumentIds
```

A AIPE passa a ser tratada conceitualmente como **instrumento auxiliar possível** no dano estético, não como consequência automática do label `Dano estético`.

No perfil `civil + aesthetic_damage`, pode ser sugerida. A médica pode rejeitar a sugestão. Em outro contexto, pode não ser sugerida e ainda assim ser explicitamente ativada pela médica quando houver fundamento metodológico próprio.

## 8. Ordem cognitiva

```text
CONTEXTO DA ATUAÇÃO
setting
  ↓
ESFERA / FINALIDADE
legalSphere + purpose
  ↓
PAPEL / MISSÃO / QUESITOS
  ↓
OBJETO MÉDICO-PERICIAL
matter + objeto delimitado
  ↓
PERFIL CONTEXTUAL
  ↓
MÉTODO GERAL
+ protocolo(s) específico(s)
+ instrumento(s) possíveis
  ↓
EVIDÊNCIAS / EXAME / ANÁLISE
  ↓
CONCLUSÃO MÉDICA PROPORCIONAL
```

## 9. Gates permanentes

- preservar campos legados até migração versionada;
- não selecionar protocolo apenas por `matter` quando o contexto puder alterar sua aplicação;
- não transformar `legalSphere`, `purposeId` ou perfil contextual em conclusão jurídica;
- sugestão de protocolo/instrumento não equivale a adoção;
- AIPE não é universalizada por matéria;
- perfis ainda não validados permanecem genéricos, sem inferência inventada;
- qualquer regra contextual nova exige justificativa metodológica, critério de aceite e regressão;
- conclusão permanece humana e proporcional às evidências.
