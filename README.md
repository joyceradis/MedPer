# MedPer

**Plataforma médico-pericial com MLKS Core** — ambiente de trabalho orientado por casos, evidências, achados estruturados, métodos de avaliação, quesitos e conclusões rastreáveis.

> O sistema organiza o raciocínio e monta a estrutura documental. A conclusão, a valoração e a assinatura permanecem sob responsabilidade do médico perito.

## Estrutura funcional

O caso reúne, em um único fluxo:

- delimitação literal do objeto determinado pelo juízo;
- dados processuais e limites da atuação pericial;
- inventário de fontes e evidências;
- cronologia;
- entrevista e exame médico-pericial;
- observações e achados independentes;
- grafo e matriz de rastreabilidade;
- raciocínio sobre nexo, temporalidade, consolidação e repercussões;
- avaliação do dano estético pelo AIPE;
- classificação e resposta aos quesitos;
- montagem do laudo;
- validação final de escopo e fundamentação;
- exportação JSON e funcionamento offline.

## Executar localmente

O projeto é um PWA estático. Execute por HTTP:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Publicação

A branch `main`, servida a partir da raiz, é compatível com GitHub Pages.

## Segurança

O protótipo grava dados no `localStorage` do navegador. **Não utilize dados reais, identificáveis, sigilosos ou assistenciais.** Autenticação, criptografia, segregação de acesso, trilha de auditoria imutável e backend seguro pertencem à fase de produção.

## Organização

- `index.html` — entrada única da aplicação;
- `css/styles.css` — identidade visual MedPer/MLKS Core;
- `js/` — domínio, persistência, AIPE, quesitos, laudo e aplicação;
- `pages/` — rotas estáticas para os módulos do caso;
- `casos/` — rotas de entrada para visão geral e caso ativo;
- `data/mlks.schema.json` — esquema de exportação;
- `docs/ARCHITECTURE.md` — arquitetura e princípios do MLKS Core;
- `manifest.webmanifest`, `sw.js` e `icon.svg` — PWA.

## Princípios

- objeto pericial antes do protocolo;
- fatos antes de conclusões;
- nenhuma conclusão sem evidência;
- rastreabilidade integral;
- IA assistiva, nunca decisória;
- métodos como AIPE desacoplados do núcleo clínico;
- validação humana obrigatória.
