# MedPer — mapa canônico de superfícies

## Site público

`/` — landing institucional pública.

## Aplicação

`/app.html` — entrada da aplicação.

### Superfícies operacionais

- `#/dashboard/overview` — Visão geral. Último caso, próximos prazos, pendências e atalhos.
- `#/dashboard/cases` — Meus casos. Filtros, lifecycle, organização e abertura do inspector.
- `#/dashboard/deadlines` — Agenda e prazos. Compromissos e criticidade temporal.
- `#/dashboard/references` — Referências técnicas. Biblioteca e governança documental.
- `#/dashboard/models` — Modelos e checklists. Área auxiliar governada.

### Inspector contextual

Aberto sobre as superfícies operacionais ao selecionar um caso. Responde: que caso é, onde está, o que falta, próximo prazo, referências e atividade. Não contém campos de edição do raciocínio pericial.

### Workspace médico-pericial

`#/case/:caseId/:stage`

1. `delimitation` — Delimitação
2. `evidence` — Autos e evidências
3. `timeline` — Cronologia
4. `hypotheses` — Hipóteses e diligências
5. `method` — Exame e método
6. `reasoning` — Fundamentação
7. `conclusion` — Conclusão
8. `questions` — Quesitos
9. `report` — Documento

AIPE permanece dentro de `method` quando o domínio de dano estético e o contexto metodológico justificarem sua utilização. A referência não gera conclusão automática.

## Regra arquitetural

Dashboard gere. Inspector reconhece. Workspace trabalha e raciocina. Biblioteca consulta e audita conhecimento.
