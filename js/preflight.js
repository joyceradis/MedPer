(() => {
  'use strict';

  const currentKey = 'medper.state.v2';
  const legacyKey = 'mlks.prototype.v1';
  const timestamp = new Date().toISOString();

  function safeState(raw) {
    try {
      const parsed = JSON.parse(raw || '{}');
      return {
        version: 2,
        updatedAt: parsed.updatedAt || timestamp,
        currentCaseId: parsed.currentCaseId || null,
        cases: Array.isArray(parsed.cases) ? parsed.cases : []
      };
    } catch {
      return { version: 2, updatedAt: timestamp, currentCaseId: null, cases: [] };
    }
  }

  const current = localStorage.getItem(currentKey);
  if (current) {
    const normalized = safeState(current);
    if (JSON.stringify(normalized) !== current) {
      localStorage.setItem(`${currentKey}.backup.${Date.now()}`, current);
      localStorage.setItem(currentKey, JSON.stringify(normalized));
    }
    return;
  }

  const legacy = localStorage.getItem(legacyKey);
  if (legacy) {
    localStorage.setItem(`${legacyKey}.backup.${Date.now()}`, legacy);
    localStorage.setItem(currentKey, JSON.stringify(safeState(legacy)));
    return;
  }

  localStorage.setItem(currentKey, JSON.stringify(safeState('')));
})();
