import { MEDPER_PROFESSIONAL_API_ORIGIN as configuredOrigin } from './config.js';
import { configureRemoteSession, remoteRequest } from '../v2/remote-repository.js';

const gate = document.getElementById('access-gate');
const form = document.getElementById('login-form');
const status = document.getElementById('access-status');
const button = document.getElementById('login-submit');

function display(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

async function apiCall(url, options = {}) {
  let result;
  try {
    result = await fetch(url, {credentials:'omit',cache:'no-store',redirect:'error',...options});
  } catch {
    throw new Error('API indisponível ou conexão não autorizada. Nenhum dado foi transferido.');
  }
  return result;
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
        api.pathname !== '/' || api.username || api.password || api.search || api.hash) {
      throw new Error('Origem de API insegura.');
    }
    origin = api.origin;
    // Production readiness is required. This must never silently fall back to
    // local browser case storage.
    const response = await apiCall(origin + '/ready');
    if (!response.ok) throw new Error('API não está pronta para uso.');
    const ready = await response.json();
    if (ready.status !== 'ready' || ready.security !== 'ok' || ready.fileStorage !== 'ready' || ready.professionalAccess !== 'ready') {
      throw new Error('API sem requisitos mínimos de segurança e cifragem.');
    }
  } catch(error) {
    display(error.message || 'API não configurada para acesso profissional.', true);
    return;
  }

  display('Servidor disponível. Acesso apenas por conta existente no backend; use dados fictícios.');
  form.hidden = false;
  form.onsubmit = async event => {
    event.preventDefault();
    button.disabled = true;
    display('Verificando credenciais...');
    try {
      const body = new URLSearchParams({
        username: form.elements.namedItem('email').value.trim(),
        password: form.elements.namedItem('password').value,
        grant_type: 'password'
      });
      const tokenResponse = await apiCall(origin + '/auth/token', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body
      });
      form.elements.namedItem('password').value = '';
      if (!tokenResponse.ok) throw new Error('Acesso não autorizado ou serviço indisponível.');
      const pair = await tokenResponse.json();
      configureRemoteSession({
        apiOrigin: origin,
        accessToken: pair.access_token,
        refreshToken: pair.refresh_token
      });
      const identity = await remoteRequest('/auth/me');
      if (!identity || !identity.id || !identity.role) throw new Error('Identidade profissional não confirmada.');
      display('Sessão autenticada. Carregando ambiente profissional...');
      document.getElementById('app').hidden = false;
      gate.remove();
      // The same application code and 11-step medical-legal workflow is used.
      await import('../v2/app.js');
    } catch(error) {
      display(error.message || 'Falha ao autenticar. Não foi aberto modo local.', true);
    } finally {
      button.disabled = false;
    }
  };
}

await init();
