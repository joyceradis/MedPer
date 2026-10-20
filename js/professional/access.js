import {
  MEDPER_PROFESSIONAL_API_ORIGIN as configuredOrigin,
  MEDPER_GOOGLE_CLIENT_ID as googleClientId
} from './config.js';
import {
  configureRemoteSession, remoteRequest, logoutRemoteSession
} from '../v2/remote-repository.js';

const gate = document.getElementById('access-gate');
const form = document.getElementById('login-form');
const status = document.getElementById('access-status');
const passwordButton = document.getElementById('login-submit');
const googleArea = document.getElementById('google-signin');
let loginBusy = false;

function display(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

async function apiCall(url, options = {}) {
  try {
    return await fetch(url, {credentials:'omit', cache:'no-store', redirect:'error', ...options});
  } catch {
    throw new Error('API indisponível ou conexão não autorizada. Nenhum dado foi transferido.');
  }
}

async function finishLogin(origin, pair) {
  if (!pair?.access_token || !pair?.refresh_token) {
    throw new Error('A autenticação não retornou uma sessão válida.');
  }
  configureRemoteSession({
    apiOrigin: origin,
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token
  });
  const identity = await remoteRequest('/auth/me');
  if (!identity?.id || !identity?.role) throw new Error('Identidade profissional não confirmada.');
  display('Sessão autenticada. Carregando ambiente profissional...');
  await import('../v2/app.js');
  document.getElementById('app').hidden = false;
  gate.remove();
}

async function submitCredential(origin, urlPath, body, contentType) {
  if (loginBusy) return;
  loginBusy = true;
  passwordButton.disabled = true;
  display('Verificando identidade com o servidor...');
  try {
    const response = await apiCall(origin + urlPath, {
      method:'POST', headers:{'Content-Type':contentType}, body
    });
    if (!response.ok) {
      if (response.status === 403 && urlPath.includes('/google/')) {
        throw new Error('Conta Google ainda não vinculada ou autorizada no MedPer. Entre com senha e vincule a conta antes de usar Google.');
      }
      throw new Error('Acesso não autorizado ou serviço indisponível.');
    }
    const pair = await response.json();
    await finishLogin(origin, pair);
  } catch (error) {
    try { await logoutRemoteSession(); } catch { /* login may not have started */ }
    display(error.message || 'Falha ao autenticar. Não foi aberto modo local.', true);
  } finally {
    loginBusy = false;
    passwordButton.disabled = false;
  }
}

function prepareGoogleLogin(origin) {
  // Public client ID only; never enable a placeholder button without an
  // authorized Google origin and verified backend.
  if (!googleClientId || !/^[0-9a-zA-Z_-]+\.apps\.googleusercontent\.com$/.test(googleClientId)) return;
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    const gis = window.google?.accounts?.id;
    if (!gis) return;
    gis.initialize({
      client_id: googleClientId,
      auto_select: false,
      callback: response => {
        const credential = response?.credential;
        if (typeof credential !== 'string' || !credential) {
          display('O Google não retornou uma credencial válida.', true);
          return;
        }
        void submitCredential(
          origin, '/auth/google/token', JSON.stringify({credential}), 'application/json'
        );
      }
    });
    gis.renderButton(document.getElementById('google-button'), {
      theme:'outline', size:'large', shape:'rectangular',
      text:'signin_with', width:270
    });
    googleArea.hidden = false;
  };
  script.onerror = () => {
    googleArea.hidden = true;
    display('Login com Google temporariamente indisponível. O acesso por senha continua disponível.', true);
  };
  document.head.appendChild(script);
}

async function init() {
  if (!configuredOrigin) {
    display('Servidor profissional ainda não configurado. A demonstração local continua disponível; não existe login ativo nesta página.', true);
    return;
  }
  let origin;
  try {
    const api = new URL(configuredOrigin);
    const local = ['localhost','127.0.0.1'].includes(api.hostname);
    if ((api.protocol !== 'https:' && !(local && api.protocol === 'http:')) ||
        api.pathname !== '/' || api.username || api.password ||
        api.search || api.hash) throw new Error('Origem de API insegura.');
    origin = api.origin;
    const response = await apiCall(origin + '/ready');
    if (!response.ok) throw new Error('API não está pronta para uso.');
    const ready = await response.json();
    if (ready.status !== 'ready' || ready.security !== 'ok' ||
        ready.fileStorage !== 'ready' || ready.professionalAccess !== 'ready') {
      throw new Error('API sem requisitos mínimos de segurança e cifragem.');
    }
  } catch(error) {
    display(error.message || 'API não configurada para acesso profissional.', true);
    return;
  }

  display('Servidor disponível. Acesso apenas por conta autorizada; use dados fictícios.');
  form.hidden = false;
  prepareGoogleLogin(origin);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const body = new URLSearchParams({
      username: form.elements.namedItem('email').value.trim(),
      password: form.elements.namedItem('password').value,
      grant_type: 'password'
    });
    form.elements.namedItem('password').value = '';
    void submitCredential(origin, '/auth/token', body, 'application/x-www-form-urlencoded');
  });
}

await init();
