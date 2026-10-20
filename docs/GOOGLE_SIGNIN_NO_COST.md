# MedPer Professional — Google Sign-In sem contratação

Checkpoint: 20/10/2026. **Implementado em PR empilhada sobre #120; não ativado em produção.**

## Decisão técnica

Reutilizar FastAPI/JWT/organizações existentes, com Google Identity Services para confirmar a identidade. **Google não armazena nem recebe casos periciais nesta integração.** Não criar segunda base de usuários, nem pagar por Identity Platform, Supabase ou serviço de autenticação.

- A verificação é feita no servidor contra chaves públicas Google, audience exata, issuer, expiração, e-mail verificado e identificador imutável `sub`.
- Uma conta já existente precisa ser vinculada explicitamente por sessão MedPer autenticada usando `POST /auth/google/link`.
- Coincidência de e-mail não vincula automaticamente uma identidade Google a conta anterior.
- Primeiros cadastros por Google estão proibidos por padrão. A flag `MEDPER_GOOGLE_SELF_SIGNUP_ENABLED` exige decisão separada e só funciona com API profissional efetivamente pronta.
- Tokens do MedPer ficam na memória do navegador e não são persistidos por este cliente.
- Nenhuma integração altera os dados da demonstração, importa casos legados ou gera conclusões médicas.

## Dependências externas indispensáveis — nunca inventar

1. Criar um Client ID OAuth 2.0 **do tipo Aplicativo da Web** no Google Cloud, com tela de consentimento e a origem JavaScript `https://joyceradis.github.io` autorizada. Não é preciso um client secret para o botão Google GIS de navegador. Registrar o ID público sem expor segredos.
2. Definir o mesmo ID público como `MEDPER_GOOGLE_CLIENT_ID` no backend e em `js/professional/config.js` no frontend, após autorização do responsável técnico e testes de origem.
3. Informar a URL da API **HTTPS** já homologada em `MEDPER_PROFESSIONAL_API_ORIGIN`. Enquanto ficar vazia, a tela de autenticação fica bloqueada.
4. Para habilitar efetivamente o modo profissional, exigir `MEDPER_PROFESSIONAL_ENABLED=true` somente em backend aprovado com PostgreSQL durável, chave Fernet, JWT forte, TLS, controle de autorização por caso, backup/restore e auditoria de privacidade. `/ready` deve declarar `professionalAccess=ready`; caso contrário nem o formulário nem o botão Google são oferecidos.
5. Cadastrar a primeira conta por processo seguro ou, para uma conta com senha existente, vinculá-la explicitamente antes de aceitar login Google. Não ativar self-signup indiscriminado em produção.

## Condição de custo zero aplicada no Git

O arquivo `render.yaml` de preview **não cria banco pago nem disco persistente**, mantém `plan: free` e `autoDeploy: false`. Um teste automatizado reprova o retorno desses recursos ou a ativação prematura de funcionalidades profissionais. A realização de testes locais e na CI não requer contratar infraestrutura.

Limites: banco PostgreSQL gratuito da Render expira e não possui backup; web service gratuito pode suspender/hibernar ou ter limites. Não usar esse arranjo como repositório de casos reais. A gratuidade é restrita ao código/preview e aos limites do provedor; nenhum serviço externo foi provisionado aqui. Produção 24/7 com armazenamento durável, cópia de segurança, controle de acessos e requisitos LGPD não é garantida a custo zero.

## Contratos e testes

- Backend: `/auth/google/token`, `/auth/google/link`, migração `0007_google_subject`, `tests/test_google_auth.py`, sem tráfego externo de teste e com JWT RSA sintético.
- Frontend: botão Google só renderiza com API pronta e Client ID aprovado; erro na biblioteca Google não interrompe o acesso por senha.
- Playwright: a biblioteca GIS e a API de teste são substituídas por fixtures sintéticas, não há conta Google real.
- Regressão: `tests/free-hosting-guard.test.mjs` evita recursos cobrados e liberação prematura.

## Próximo gate operacional

A integração poderá ser ativada em homologação **apenas** após a revisão de #120 e desta PR, reconciliação com CSS do Claude já publicado e provisionamento explícito de um backend durável/seguro. Não considerar isso lançamento comercial, não fazer merge sensível ou deploy automático e não pedir à profissional testes repetitivos de login.
