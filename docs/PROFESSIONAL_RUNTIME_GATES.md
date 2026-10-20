# MedPer Professional — arquitetura executável e portões de lançamento

Data: 20/10/2026. Estado: ponte backend-front implementada e testada com cenários fictícios; implantação e dados reais NÃO autorizados.

## Runtime: o site não é mais limitado ao armazenamento local

- Demonstrativo: app.html permanece V2 com IndexedDB/localStorage. Funciona offline, sem login, apenas com exemplos fictícios.
- Professional: professional.html é uma segunda ENTRADA na MESMA V2. Usa RemoteCaseRepository, que consulta a API FastAPI/PostgreSQL existente e nunca migra/faz fallback para o armazenamento da demonstração.
- Não foi criado produto terceiro, frontend novo para o workflow, nem mecanismo clínico duplicado. As onze etapas, fontes, método, quesitos e documento continuam na V2.
- Criação do caso e payload V2 é atômica no backend. A API gera o ID e usa revisões CAS: alterações concorrentes causam HTTP 409, sem sobrescrita silenciosa.
- Autenticação existente: Argon2, JWT, refresh rotation, verificação /auth/me. Tokens no frontend ficam apenas em memória e são descartados no reload; logout tenta revogar o refresh no servidor.
- Servidor já contém modelos e controles de prazo, evidências, anexos, auditoria e segurança que devem ser reutilizados por futuras automações.

## Portões para habilitar

1. A configuração pública de origem da API permanece vazia: o login Professional não aparece enquanto faltar infraestrutura de backend.
2. A API expõe professionalAccess=ready apenas quando existe ativação explícita, ambiente production/staging, segredo JWT forte, chave Fernet válida e URL de PostgreSQL. O cliente exige esses sinais além de /ready. Todas as rotas de autenticação, casos, importação e arquivos também exigem esse gate no servidor, antes de autenticar ou abrir o banco; sem ele retornam 503. A exceção local exige MEDPER_DEVELOPMENT_API_ENABLED=true e ambiente development/test, nunca production/staging.
3. O blueprint Render conserva autoDeploy=false e Professional desativado. Alterar variáveis, provisionar banco/serviço, contratar fornecedor ou implantar requer decisão e governança próprias.
4. Antes de aceitar dados reais: testar isolamento entre usuários de uma mesma organização e autorização por caso, TLS, CSP restrita à API escolhida, RLS, vazamento de logs, backup/restauração, retenção, resposta a incidentes, exportação e exclusão sob LGPD.
5. Jamais importar ou apagar automaticamente casos V2 locais ou estados legados. O contrato e a migração não destrutiva permanecem sob as issues #69 e #95.
6. GitHub Pages serve o shell de interface, mas não hospeda o banco nem os jobs. Assets estáticos + API autenticada + banco e workers constitui aplicação web dinâmica; não é necessário abandonar HTML para obter lógica de servidor.

## Aceite automático incorporado

- Python/FastAPI: autenticação obrigatória, isolamento multi-organização, gravação e leitura cifradas, criação atômica, revisão 1→2, conflito 409, rejeição 422, gate production sem criptografia e rotas bloqueadas antes do banco. O job PostgreSQL exige URL PostgreSQL explícita; a configuração de testes não a substitui por SQLite.
- Node: origem segura, sessão somente em memória, sem gravação de credenciais em localStorage, falha de rede/autorização sem fallback, CAS e recusa de schema antigo.
- Chromium: login errado não abre o app, login correto reusa V2, cria caso sintético no servidor, edita, reabre, recarrega e exige reautenticação. Não usa pacientes/processos reais.
- Demonstração: suites existentes garantem navegação, IndexedDB, recuperação e modo offline.

## Próximas automações, sem criar infraestrutura duplicada

- Processos e prazos: usar modelos de deadlines e uma fila persistente com workers idempotentes, entrega auditável e regras de cancelamento.
- Fluxos periciais: tarefas, pendências, matrizes de evidência, geração de documento com proveniência e revisão humana.
- Comercialização: plano de acesso, licença, times/permissões por caso, suporte, billing auditável, observabilidade e controles de privacidade.
- Conteúdo médico-pericial não é gerado automaticamente como conclusão; escalas e parecer permanecem sob supervisão da responsável técnica.

## Proibição de publicação prematura

Esta integração não torna o MedPer pronto para pacientes, perícias reais ou venda. Não habilitar, fazer merge às cegas ou executar deploy enquanto a CI de segurança não estiver reconciliada. Nenhum token, arquivo clínico ou processo pode entrar na CI.