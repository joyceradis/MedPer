# MLKS

**Medical-Legal Knowledge System** — protótipo de uma plataforma de apoio ao raciocínio médico-legal, centrada em evidências, achados estruturados e conclusões rastreáveis.

> Não é um gerador de laudos. O laudo é uma saída possível de um domínio médico-legal estruturado.

## Protótipo

O MVP atual é um PWA estático, sem dependências externas, pronto para GitHub Pages.

### Recursos

- criação de casos e definição do objeto pericial;
- linha do tempo;
- evidências documentais, clínicas e fotográficas;
- observações vinculadas às fontes;
- achados clínicos estruturados;
- grafo médico-legal visual;
- análise manual de nexo, temporalidade, consolidação e repercussões;
- regra **nenhuma conclusão sem evidência**;
- matriz de rastreabilidade;
- auditoria estrutural;
- autosave local;
- exportação JSON;
- funcionamento offline após o primeiro carregamento.

## Executar localmente

Como o projeto usa Service Worker, execute por HTTP em vez de abrir o arquivo diretamente:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Publicação

O projeto pode ser publicado diretamente pelo GitHub Pages a partir da branch `main` e da raiz do repositório.

## Segurança

O protótipo grava dados no `localStorage` do navegador. **Não utilize dados reais, identificáveis, sigilosos ou assistenciais.** Autenticação, criptografia, segregação de acesso, auditoria imutável e backend seguro pertencem à próxima fase.

## Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [JSON Schema](./data/mlks.schema.json)

## Princípios

- data first;
- fatos antes de conclusões;
- rastreabilidade integral;
- IA assistiva, não decisória;
- metodologias desacopladas do núcleo clínico;
- validação humana obrigatória.

## Estrutura unificada desta entrega

O caso agora inclui delimitação judicial, cronologia, exame pericial, avaliação estética AIPE, quesitos, montador de laudo e validação final. As páginas em `pages/` e `casos/` são rotas estáticas para as respectivas áreas da SPA, mantendo publicação simples no GitHub Pages.
