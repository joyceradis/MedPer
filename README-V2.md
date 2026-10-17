# MedPer V2 · execução pública atual

**Estado:** protótipo `local-first`, sem autenticação do frontend público V2 nem persistência remota integrada. Não utilizar com dados reais pessoais, médicos ou processuais. Consulte o [mapa de runtime e dados](docs/V2_RUNTIME.md).

O `app.html` executa `js/v2/app.js`. As regras e telas existentes em `js/core/**` e `js/ui/**` pertencem, em parte, ao runtime anterior; o banco FastAPI/PostgreSQL e o schema Supabase não são sinônimos de conexão funcional à V2.

## Fluxo do workspace publicado

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

## Persistência

- **Primária:** IndexedDB (`medper-v2`, store `cases`).
- **Fallback:** `localStorage` (`medper:v2:cases`).
- **Contrato em uso:** `js/v2/case-record.js`, `schemaVersion: 2`.
- **Backup:** exportação/importação JSON do navegador; trata-se de arquivo potencialmente identificável, sem proteção criptográfica adicional no módulo V2.
- **Limitação:** preservação e migração íntegra de formatos históricos ainda exigem implementação e testes dedicados; não converter casos reais.

## Testes e critérios

```bash
npm run audit
```

A suíte inclui testes do núcleo V2, mas nenhum status verde isolado comprova integridade completa em browser, segurança ou liberação operacional. Critérios completos em [docs/medper-v2-acceptance.md](docs/medper-v2-acceptance.md) e [ROADMAP.md](ROADMAP.md).

## Método pericial

O sistema organiza informações e sugere instrumentos por contexto; a perita mantém a seleção, a valoração, a conclusão e a responsabilidade pelo laudo. Não alterar método AIPE, POSAS ou baremas sem análise de fonte e validação médica expressa.
