import { normalizeCaseRecord, touchCase, importCaseRecord, serializeCaseRecord } from './case-record.js';

// The professional transport is explicitly opt-in and NEVER reads or writes the
// demo's browser database and fallback store; session credentials are memory-only.
let session = null;
let refreshTask = null;

export function configureRemoteSession({ apiOrigin, accessToken, refreshToken }) {
  const parsed = new URL(String(apiOrigin));
  const localhost = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(localhost && parsed.protocol === 'http:')) ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      parsed.pathname !== '/' || !accessToken || !refreshToken) {
    throw new Error('Configuração de API ou sessão profissional inválida.');
  }
  session = {
    origin: parsed.origin,
    accessToken: String(accessToken),
    refreshToken: String(refreshToken)
  };
}

export function isRemoteSessionActive() { return Boolean(session); }
export function remoteApiOrigin() { return session?.origin || null; }

async function directRequest(path, { method = 'GET', data, accessToken } = {}) {
  if (!session) throw new Error('Sessão profissional não iniciada.');
  const endpoint = new URL(path, session.origin + '/');
  if (endpoint.origin !== session.origin || !path.startsWith('/')) {
    throw new Error('Endpoint externo à API autorizada.');
  }
  const headers = { Authorization: 'Bearer ' + (accessToken || session.accessToken) };
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(endpoint.href, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data),
      credentials: 'omit', cache: 'no-store', redirect: 'error'
    });
  } catch {
    throw new Error('A API não respondeu. Nenhuma alteração local foi apagada; tente novamente.');
  }
  let result = null;
  try { if (response.status !== 204) result = await response.json(); }
  catch { throw new Error('Resposta ilegível da API, sem confirmação de gravação.'); }
  return { response, result };
}

async function refreshAccessToken() {
  if (!session) throw new Error('Sessão profissional indisponível.');
  if (!refreshTask) {
    const origin = session.origin;
    const refresh = session.refreshToken;
    refreshTask = (async () => {
      let response;
      try {
        response = await fetch(origin + '/auth/refresh', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({refresh_token:refresh}),
          credentials:'omit', cache:'no-store', redirect:'error'
        });
      } catch { throw new Error('Não foi possível renovar a sessão; a edição atual não foi descartada.'); }
      if (!response.ok) throw new Error('Sessão expirada. Não feche o caso com alterações pendentes; entre novamente após preservar o texto.');
      const pair = await response.json();
      if (!pair.access_token || !pair.refresh_token) throw new Error('Renovação inválida.');
      session.accessToken = pair.access_token;
      session.refreshToken = pair.refresh_token;
    })().finally(() => { refreshTask = null; });
  }
  await refreshTask;
}

export async function remoteRequest(path, options = {}) {
  let {response, result} = await directRequest(path, options);
  if (response.status === 401 && path !== '/auth/refresh') {
    await refreshAccessToken();
    ({response, result} = await directRequest(path, options));
  }
  if (!response.ok) {
    const detail = typeof result?.detail === 'string' ? result.detail : '';
    if (response.status === 409) {
      throw new Error('Conflito de revisão (HTTP 409): outra sessão alterou este caso. Nenhum dado foi sobrescrito. Preserve sua edição e reconcilie antes de salvar.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Acesso recusado pelo servidor; nenhuma alteração foi confirmada.');
    }
    throw new Error('API ' + response.status + (detail ? ': ' + detail : '. Operação não confirmada.'));
  }
  return result;
}

export async function logoutRemoteSession() {
  if (!session) return;
  const tokens = session;
  // Explicit server revocation. Do not drop the token before attempting it.
  try {
    await fetch(tokens.origin + '/auth/logout', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:tokens.refreshToken}),
      cache:'no-store',credentials:'omit',redirect:'error'
    });
  } finally {
    session = null;
  }
}

// This implements the same interface as the V2 browser repository without
// transforming older stores. The server generates case IDs; updates use CAS.
export class RemoteCaseRepository {
  constructor() {
    if (!session) throw new Error('O modo profissional exige autenticação real.');
    this.mode = 'remote';
    this.revisions = new Map();
  }

  async list() {
    const summaries = await remoteRequest('/cases');
    if (!Array.isArray(summaries)) throw new Error('Lista de casos inválida.');
    const cases = await Promise.all(summaries.map(item => this.get(item.id)));
    return cases.sort((a,b) =>
      String(b.metadata?.updatedAt || '').localeCompare(String(a.metadata?.updatedAt || '')));
  }

  async get(id) {
    const response = await remoteRequest('/cases/' + encodeURIComponent(id) + '/state');
    if (!response || !Number.isInteger(response.revision) ||
        response.payload?.schemaVersion !== 2 ||
        response.payload.id !== id) {
      throw new Error('Caso remoto com contrato incompatível. Preserve os registros; migração assistida necessária.');
    }
    this.revisions.set(id, response.revision);
    return normalizeCaseRecord(response.payload);
  }

  async create(record) {
    const payload = normalizeCaseRecord(record);
    const result = await remoteRequest('/cases/v2', {method:'POST', data:{payload}});
    if (!result?.id || result.revision !== 1) {
      throw new Error('Criação não confirmada. Não crie novamente antes de conferir a lista de casos.');
    }
    this.revisions.set(result.id, result.revision);
    return {...payload, id:result.id};
  }

  async save(record) {
    const id = String(record?.id || '');
    const revision = this.revisions.get(id);
    if (!Number.isInteger(revision)) {
      throw new Error('Revisão remota desconhecida. Reabra o caso antes de salvar; nada foi sobrescrito.');
    }
    const payload = touchCase(record);
    const result = await remoteRequest('/cases/' + encodeURIComponent(id) + '/state', {
      method:'PUT', data:{payload, expectedRevision:revision}
    });
    if (!Number.isInteger(result?.revision) || result.revision !== revision + 1) {
      throw new Error('Servidor não confirmou a revisão. Verifique antes de continuar.');
    }
    this.revisions.set(id, result.revision);
    return payload;
  }

  async remove(id) {
    await remoteRequest('/cases/' + encodeURIComponent(id), {method:'DELETE'});
    this.revisions.delete(id);
  }

  async export(id) {
    const record = await this.get(id);
    return serializeCaseRecord(record);
  }

  async import(payload) {
    importCaseRecord(payload); // validate without side effects
    throw new Error('Importação local→servidor ainda bloqueada: exige conferência de conflitos e migração assistida.');
  }
}
