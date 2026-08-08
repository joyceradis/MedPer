# Auditoria — sugestão de protocolo ≠ adoção

Data: 2026-08-08
Status: corrigido e validado
Achado: METH-002

## Problema

Durante a auditoria final da resolução metodológica contextual foi identificado que `getApplicableProtocols()` ainda incorporava automaticamente o retorno de `getSuggestedProtocolIds()`.

Isso violava uma invariante recém-formalizada do produto:

> sugestão metodológica não equivale a escolha médica.

Na prática, um objeto que mencionasse nexo causal poderia fazer o protocolo de causalidade entrar no conjunto efetivamente auditado sem confirmação explícita da médica.

## Contrato corrigido

`getSuggestedProtocolIds(caseData)` continua responsável por detectar sugestões conservadoras.

`getApplicableProtocols(caseData)` agora contém apenas:

1. protocolo-base da matéria primária;
2. protocolos explicitamente adicionados em `methodology.activeProtocolIds`.

Protocolos sugeridos não entram em auditoria, completude ou bloqueios até seleção explícita.

## TDD

### RED

PR de verificação `#36`.

O novo teste exigiu:

```text
objeto menciona nexo
→ causation aparece em suggestedProtocolIds
→ causation NÃO aparece em applicableProtocols
```

O Frontend Audit falhou no comportamento antigo, confirmando o defeito.

### GREEN

Correção em `js/methodology/protocols.js`.

PR de verificação `#37`:

- Frontend Audit run 214 — SUCCESS;
- Regression Audit run 122 — SUCCESS.

## Regressões protegidas

A suíte agora verifica que:

- protocolo primário permanece aplicável;
- protocolo adicional só entra após seleção médica explícita;
- sugestão permanece visível sem ser adotada;
- rejeição/dismissal remove a sugestão;
- protocolos explicitamente ativos continuam participando da auditoria e completude.

## Regra permanente

> O MedPer pode reconhecer e apresentar uma hipótese metodológica pertinente. Somente a médica transforma essa hipótese em protocolo ativo.

Essa regra vale tanto para protocolos quanto, separadamente, para instrumentos auxiliares.
