# MedPer · runtime público V2 e fronteiras de dados

**Levantamento estático:** 17/10/2026, `main d85ff085524c`. Este documento descreve o caminho de execução observado no repositório, **não** certifica comportamento no navegador nem autoriza dados reais.

## Entrada efetivamente publicada

```text
GitHub Pages
├── index.html                  apresentação pública
└── app.html                    aplicativo V2
    ├── css/v2.css              estilo
    ├── js/v2/app.js            navegação e 11 etapas do caso
    ├── js/v2/case-record.js    modelo CaseRecord schemaVersion 2
    ├── js/v2/repository.js     persistência local
    ├── js/v2/method-router.js  sugestão contextual de instrumentos
    ├── js/v2/document.js       composição de documento
    └── sw.js                   cache do shell offline
```

A entrada `app.html` carrega `./js/v2/app.js?v=2.0.0` como módulo. A V2 usa IndexedDB `medper-v2` / object store `cases` e, se indisponível, fallback em `localStorage` `medper:v2:cases`. O banco e as APIs FastAPI/PostgreSQL existentes em `backend/` **não integram** esse caminho de salvamento; `supabase/` é outra proposta histórica, não serviço da V2.

A V2 apresenta **11 etapas** (ver [README-V2](../README-V2.md)); documentos que mencionam navegação de 9 etapas e propriedade exclusiva de `js/core/store.js` descrevem o frontend anterior. O store antigo e suas migrações permanecem no repositório, mas **não são chamados automaticamente pela V2**. Não existe garantia comprovada de migração integral das chaves `medper.state.v4/v3/v2` e `mlks.prototype.v1` para a V2. Veja issues [#69](https://github.com/joyceradis/MedPer/issues/69) e [#95](https://github.com/joyceradis/MedPer/issues/95).

## Dados e compatibilidade

- A aplicação V2 permite dados identificadores e processuais no formulário, mas `js/v2/repository.js` **não oferece criptografia da persistência local**.
- JSON exportado é arquivo local potencialmente sensível. A importação de versão não reconhecida é recusada, assim como substituição silenciosa de caso com ID já existente. Controle de acesso, backup, retenção e recuperação não são validados para casos reais.
- `normalizeCaseRecord` contempla V2 e uma conversão parcial de formato genérico antigo; **não equivale a migração completa dos estados v4 do frontend anterior**.
- Trocas de perfil/navegador, limpeza do storage ou falha de armazenamento podem tornar casos inacessíveis; não presumir integridade sem testes.
- O backend possui controles próprios, mas eles não protegem o armazenamento local da V2 por mera coexistência no mesmo repositório.

**Decisão vigente:** uso somente com exemplos totalmente fictícios. Não usar a demonstração para perícias, prontuários ou documentos judiciais reais.

## Verificações e próximos gates

| Gate | Evidência mínima |
| --- | --- |
| Entrada V2 | `app.html` carrega apenas o módulo esperado |
| Persistência | salvar/reabrir; indisponibilidade IndexedDB; quota; erro visível; backup/importação sintéticos |
| Compatibilidade | matriz V2 ↔ v4/v3/v2/MLKS, sem alteração ou exclusão de dados legados |
| CI | testes exercitam decisões de fluxo e persistência, além de sintaxe e presença de strings |
| Segurança | nenhuma promessa de confidencialidade em `localStorage`/IndexedDB; controle efetivo antes de qualquer dado real |
| Domínio | escolhas de AIPE, POSAS e baremas dependem de aprovação metodológica, nunca de inferência da interface |
| Produto | revisão mobile e desktop, acessibilidade e comparação visual manual |
| Infra | decisão de backend único (#68) e contrato versionado (#69) antes de sincronização remota |

**Fonte de coordenação:** [#95](https://github.com/joyceradis/MedPer/issues/95). PRs e branches antigas são evidência, não prova de integração. Este documento não aprova merges, deploys ou migração automática.
