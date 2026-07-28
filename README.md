# MLKS

## Medical Legal Knowledge System

MLKS é uma estação de trabalho médico-legal pensada para organizar o caminho entre a documentação e a conclusão pericial.

Esta primeira versão é um MVP estático, sem backend e sem envio de dados. Ela demonstra a arquitetura de uma análise estruturada:

- caso e objeto da análise;
- fontes do caso: evidências, entrevista e exame clínico;
- base de achados;
- motor de raciocínio separado em nexo causal, temporalidade, consolidação e repercussões;
- sinalizações técnicas e pendências;
- linha do caso e síntese.

## Executar

Abra `index.html` em um navegador. O projeto não exige instalação de dependências ou processo de build e pode ser publicado diretamente pelo GitHub Pages.

## Próximas camadas

1. persistência segura de casos e documentos;
2. ingestão e classificação de evidências;
3. formulários periciais reutilizáveis;
4. trilha de auditoria dos achados e das conclusões;
5. exportação de síntese e laudo em formato editável.
