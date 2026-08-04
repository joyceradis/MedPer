# Arquitetura do MLKS

## 1. Decisão central

O MLKS não é um gerador de laudos. É um sistema operacional médico-legal orientado por entidades e relações. A interface é substituível; o domínio permanece.

O fluxo conceitual é:

```text
Caso
  └── Objeto pericial
        ├── Evidências
        ├── Entrevista
        ├── Exame clínico
        └── Observações
              └── Achados estruturados
                    └── Grafo médico-legal
                          └── Raciocínio pericial
                                ├── Nexo
                                ├── Temporalidade
                                ├── Consolidação
                                └── Repercussões
                                      └── Conclusões rastreáveis
```

## 2. Princípios invariantes

1. **Data first** — telas não são proprietárias dos dados.
2. **Fatos antes de conclusões** — observação, achado, hipótese, raciocínio e conclusão são etapas distintas.
3. **Nenhuma conclusão sem evidência** — uma conclusão deve referenciar fontes e, quando aplicável, achados.
4. **IA assistiva, nunca decisória** — pode sugerir, organizar e localizar inconsistências; não define nexo, não valora dano e não substitui exame.
5. **Auditabilidade** — mudanças e relações devem poder ser reconstruídas.
6. **Metodologias desacopladas** — AIPE Brasil, ABMLPM, AMA Guides e outras referências são módulos de fundamentação, não o núcleo clínico.

## 3. Domínios

### Core

- Caso
- ObjetoPericial
- Pessoa
- Evento
- Documento
- Fotografia
- Observação
- Achado
- Conclusão

### Motor clínico

- Lesão
- Doença
- Tratamento
- Complicação
- Sequela
- Função
- Sistema

### Motor pericial

- Nexo
- Causalidade
- Temporalidade
- Consolidação
- Incapacidade
- Repercussão
- Dano estético
- Dano funcional

### Motor de evidências

Mantém as relações entre conclusão, achado, observação, exame, fotografia, documento, entrevista e quesito.

### Motor documental

Classifica e versiona prontuários, exames, laudos anteriores, CAT, BO, sentença, petições, quesitos, vídeos e fotografias históricas.

### Motor de conhecimento

Versiona referências externas: artigos, livros, diretrizes, consensos, escalas, metodologias e jurisprudência de apoio.

## 4. Fase atual: protótipo estático

O repositório contém um PWA estático executável no GitHub Pages. Ele demonstra:

- criação e troca de casos;
- delimitação do objeto pericial;
- linha do tempo;
- inventário de evidências;
- observações vinculadas às fontes;
- achados vinculados a observações e evidências;
- grafo visual simplificado;
- raciocínio manual estruturado;
- bloqueio de conclusão sem evidência;
- matriz de rastreabilidade;
- auditoria básica;
- autosave local e exportação JSON;
- cache offline por Service Worker.

Este protótipo não possui segurança suficiente para dados reais.

## 5. Arquitetura-alvo

```text
PWA / Web / iPad
       │
       ▼
API de aplicação
       │
       ├── Core Domain
       ├── Clinical Engine
       ├── Forensic Reasoning Engine
       ├── Evidence Engine
       ├── Document Engine
       └── Knowledge Engine
       │
       ├── PostgreSQL
       ├── Object Storage
       ├── Audit Log imutável
       └── Graph Database (quando justificado)
```

### Backend recomendado

- TypeScript com NestJS ou Python com FastAPI;
- DDD e Clean Architecture;
- PostgreSQL para transações;
- armazenamento de objetos para arquivos;
- fila para processamento assíncrono;
- trilha de auditoria append-only;
- OpenAPI como contrato inicial;
- Neo4j ou equivalente somente quando as consultas de grafo justificarem a complexidade.

### Frontend recomendado

- PWA responsivo;
- otimização para iPad;
- offline-first com sincronização controlada;
- autosave;
- suporte posterior a Apple Pencil;
- interface sem regras médico-legais decisórias.

## 6. Próximas entregas

1. Autenticação e segregação por organização.
2. API e persistência PostgreSQL.
3. Upload documental com hash e metadados.
4. Versionamento de entidades e trilha de auditoria.
5. Editor de protocolo por objeto pericial.
6. Motor de relações e consultas de rastreabilidade.
7. Sincronização offline segura.
8. Assistente de IA restrito por política e validação humana.
