import { createCaseRecord, importCaseRecord } from '../js/v2/case-record.js';

export const SOURCES = Object.freeze([
  { key: 'medper.state.v4', label: 'MedPer anterior (v4)', kind: 'legacy' },
  { key: 'medper.state.v3', label: 'MedPer anterior (v3)', kind: 'legacy' },
  { key: 'medper.state.v2', label: 'MedPer anterior (v2)', kind: 'legacy' },
  { key: 'mlks.prototype.v1', label: 'Protótipo inicial', kind: 'legacy' },
  { key: 'medper:v2:cases', label: 'V2 — armazenamento alternativo', kind: 'v2-local' }
]);

const DB_NAME = 'medper-v2';
const STORE = 'cases';
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);

function withDb(mode, fn) {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB indisponível neste navegador.');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB.'));
    req.onupgradeneeded = () => {
      // Opening to inspect a missing database would create an empty database.
      // This does not modify existing cases, but note it in the UI.
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(STORE, mode);
        const op = fn(tx.objectStore(STORE));
        op.onerror = () => reject(op.error || new Error('Operação IndexedDB falhou.'));
        op.onsuccess = () => { /* transaction completion is authoritative */ };
        tx.oncomplete = () => { const value = op.result; db.close(); resolve(value); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('Transação IndexedDB falhou.')); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error('Transação cancelada.')); };
      } catch (e) { db.close(); reject(e); }
    };
  });
}

export async function listCurrentCases() {
  return withDb('readonly', store => store.getAll());
}

function extract(source, raw) {
  const parsed = JSON.parse(raw);
  let records;
  if (source.kind === 'v2-local') {
    if (!isObj(parsed)) throw new Error('Mapa V2 inválido.');
    records = Object.values(parsed);
    if (!records.every(record => isObj(record) && record.schemaVersion === 2 && isObj(record.identity) && isObj(record.context))) throw new Error('Formato V2 incompatível; nenhum registro será importado.');
  } else {
    if (!isObj(parsed) || !Array.isArray(parsed.cases)) throw new Error('Estrutura antiga não reconhecida.');
    records = parsed.cases;
  }
  if (!records.every(isObj)) throw new Error('Registros com estrutura inválida.');
  return { parsed, records };
}

export async function scanRecovery(storage = localStorage) {
  const sources = SOURCES.map(source => {
    let raw;
    try { raw = storage.getItem(source.key); }
    catch (e) { return { ...source, status: 'erro', count: 0, error: String(e) }; }
    if (raw === null) return { ...source, status: 'ausente', count: 0 };
    try {
      const { records } = extract(source, raw);
      return { ...source, status: 'encontrado', count: records.length, bytes: raw.length };
    } catch (e) {
      return { ...source, status: 'incompatível', count: 0, error: e.message, bytes: raw.length };
    }
  });
  try {
    const records = await listCurrentCases();
    sources.unshift({ key: DB_NAME, label: 'V2 — IndexedDB', kind: 'indexeddb', status: 'encontrado', count: records.length });
  } catch(e) {
    sources.unshift({ key: DB_NAME, label: 'V2 — IndexedDB', kind: 'indexeddb', status: 'erro', count: 0, error: e.message });
  }
  return sources;
}

export function buildBackup(key, storage = localStorage) {
  if (!SOURCES.some(x => x.key === key)) throw new Error('Origem desconhecida.');
  const raw = storage.getItem(key);
  if (raw === null) throw new Error('Origem não encontrada.');
  // Back up the exact raw value, even if JSON is malformed; no destructive normalization.
  return { filename: 'medper-resgate-' + key.replace(/[^a-z0-9.-]/gi, '-') + '.json',
    content: JSON.stringify({ format: 'medper-recovery-snapshot-v1', origin: key, capturedAt: new Date().toISOString(), raw }, null, 2) };
}

export function downloadBackup(backup) {
  const blob = new Blob([backup.content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backup.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Converts only supported structural fields, while preserving the COMPLETE untouched
// original legacy case inside legacyArchive; this is NOT semantic migration validation.
export function convertLegacy(record, sourceKey, index) {
  if (!isObj(record)) throw new Error('Caso legado inválido.');
  const id = String(record.id || 'legacy-' + sourceKey.replace(/[^a-z0-9]/gi, '-') + '-' + index);
  const converted = createCaseRecord({
    id, title: record.title || 'Caso legado',
    processNumber: record.reference || '',
    court: record.context?.tribunal || '',
    professionalRole: record.context?.role || '',
    context: 'civel', object: record.methodology?.general?.object || record.scope || '',
    examinedPerson: record.person?.initials || '',
    reportDeadline: ''
  });
  converted.legacyArchive = { sourceKey, original: record };
  converted.metadata.legacyStatus = 'Aguardando conferência médico-pericial dos campos migrados';
  return converted;
}

export function prepareRecovery(key, storage = localStorage) {
  const source = SOURCES.find(x => x.key === key);
  if (!source) throw new Error('Origem desconhecida.');
  const raw = storage.getItem(key);
  if (raw === null) throw new Error('Origem não encontrada.');
  const { records } = extract(source, raw);
  const converted = records.map((record, i) => source.kind === 'v2-local'
    ? importCaseRecord(record)
    : convertLegacy(record, key, i));
  const ids = converted.map(x => x.id);
  if (new Set(ids).size !== ids.length) throw new Error('IDs duplicados na origem; nenhuma alteração realizada.');
  return converted;
}

export async function recoverWithoutOverwrite(key, { backupConfirmed = false, backedUpRaw = null, storage = localStorage } = {}) {
  if (!backupConfirmed) throw new Error('Confirme que o backup foi salvo antes de continuar.');
  if (typeof backedUpRaw !== 'string' || storage.getItem(key) !== backedUpRaw) throw new Error('Os dados mudaram desde o backup. Faça um novo backup antes de migrar.');
  const items = prepareRecovery(key, storage);
  // Never overwrite current cases. Transaction makes existence check and insertion atomic.
  const existing = await listCurrentCases();
  if (existing.some(record => !isObj(record) || typeof record.id !== 'string')) throw new Error('Destino contém registros inválidos; não é seguro migrar.');
  const occupied = new Set(existing.map(x => x.id));
  const conflicts = items.filter(x => occupied.has(x.id));
  if (conflicts.length) throw new Error(conflicts.length + ' IDs já existem na V2. Nenhuma migração executada.');
  if (!items.length) return { migrated: 0 };
  await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB.'));
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, {keyPath:'id'}); };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      // add, never put: duplicate keys abort the WHOLE transaction.
      items.forEach(item => store.add(item));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Transação falhou sem gravar parcialmente.')); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('Conflito durante migração.')); };
    };
  });
  return { migrated: items.length };
}
