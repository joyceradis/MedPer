(() => {
  'use strict';

  const CONFIG_KEY = 'medper.api.config.v1';
  const STATE_KEY = 'mlks.prototype.v1';
  const defaultConfig = {
    baseUrl: 'http://localhost:8000',
    accessToken: '',
    refreshToken: ''
  };

  function loadConfig() {
    try {
      return { ...defaultConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
    } catch {
      return { ...defaultConfig };
    }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  async function request(path, options = {}, allowRefresh = true) {
    const config = loadConfig();
    const headers = new Headers(options.headers || {});
    if (config.accessToken) headers.set('Authorization', `Bearer ${config.accessToken}`);
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}${path}`, { ...options, headers });
    if (response.status === 401 && allowRefresh && config.refreshToken) {
      const refreshed = await fetch(`${config.baseUrl.replace(/\/$/, '')}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: config.refreshToken })
      });
      if (refreshed.ok) {
        const tokens = await refreshed.json();
        saveConfig({ ...config, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        return request(path, options, false);
      }
    }
    return response;
  }

  async function login(email, password) {
    const config = loadConfig();
    const body = new URLSearchParams({ username: email, password });
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) throw new Error('Não foi possível entrar na API.');
    const tokens = await response.json();
    saveConfig({ ...config, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    return tokens;
  }

  async function register(data) {
    const config = loadConfig();
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Não foi possível criar a organização.');
    const tokens = await response.json();
    saveConfig({ ...config, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    return tokens;
  }

  function currentExport() {
    const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    const current = Array.isArray(state.cases)
      ? state.cases.find((item) => item.id === state.currentCaseId) || state.cases[0]
      : null;
    if (!current) throw new Error('Nenhum caso local disponível para sincronizar.');
    return {
      schema: 'https://joyceradis.github.io/MedPer/data/mlks.schema.json',
      exportedAt: new Date().toISOString(),
      application: 'MedPer PWA',
      case: current
    };
  }

  async function syncCurrentCase() {
    const response = await request('/cases/import', {
      method: 'POST',
      body: JSON.stringify(currentExport())
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Falha na sincronização: ${detail}`);
    }
    return response.json();
  }

  async function listServerCases() {
    const response = await request('/cases');
    if (!response.ok) throw new Error('Não foi possível consultar casos da API.');
    return response.json();
  }

  async function logout() {
    const config = loadConfig();
    if (config.refreshToken) {
      await fetch(`${config.baseUrl.replace(/\/$/, '')}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: config.refreshToken })
      }).catch(() => {});
    }
    saveConfig({ ...config, accessToken: '', refreshToken: '' });
  }

  function makeDialog() {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <form method="dialog" id="apiConnectionForm">
        <div class="dialog-header"><div><span class="eyebrow">Persistência segura</span><h2>Conectar à API MedPer</h2></div><button class="icon-button" value="cancel">×</button></div>
        <label class="field"><span>Endereço da API</span><input name="baseUrl" type="url" required></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="username"></label>
        <label class="field"><span>Senha</span><input name="password" type="password" minlength="12" autocomplete="current-password"></label>
        <div class="dialog-actions">
          <button class="button button-ghost" value="cancel">Fechar</button>
          <button class="button button-ghost" type="button" data-api-action="login">Entrar</button>
          <button class="button button-primary" type="button" data-api-action="sync">Sincronizar caso atual</button>
        </div>
        <p id="apiStatus" class="muted" role="status"></p>
      </form>`;
    document.body.appendChild(dialog);
    const config = loadConfig();
    dialog.querySelector('[name="baseUrl"]').value = config.baseUrl;
    dialog.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-api-action]')?.dataset.apiAction;
      if (!action) return;
      const status = dialog.querySelector('#apiStatus');
      const form = new FormData(dialog.querySelector('form'));
      const next = { ...loadConfig(), baseUrl: String(form.get('baseUrl')).replace(/\/$/, '') };
      saveConfig(next);
      status.textContent = 'Processando…';
      try {
        if (action === 'login') {
          await login(String(form.get('email')), String(form.get('password')));
          status.textContent = 'Conectado à API.';
        } else if (action === 'sync') {
          const result = await syncCurrentCase();
          status.textContent = `Caso sincronizado. ID remoto: ${result.id}`;
        }
      } catch (error) {
        status.textContent = error.message;
      }
    });
    return dialog;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    const dialog = makeDialog();
    const button = document.createElement('button');
    button.className = 'button button-ghost';
    button.type = 'button';
    button.textContent = 'Conectar API';
    button.addEventListener('click', () => dialog.showModal());
    actions.prepend(button);
  });

  window.MedPerAPI = { request, login, register, logout, syncCurrentCase, listServerCases, loadConfig };
})();
