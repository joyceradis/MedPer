import { renderCaseInspector } from './case-inspector.js';

function findCase(store, caseId) {
  return store.getState().cases.find(item => item.id === caseId) || null;
}

export function installInspectorController({ root, store }) {
  let selectedCaseId = null;
  let activeTab = 'summary';

  function removeInspector() {
    root.querySelector('.case-inspector-layer')?.remove();
  }

  function render() {
    removeInspector();
    if (!selectedCaseId) return;
    const caseData = findCase(store, selectedCaseId);
    if (!caseData) {
      selectedCaseId = null;
      activeTab = 'summary';
      return;
    }

    const layer = document.createElement('div');
    layer.className = 'case-inspector-layer';
    layer.innerHTML = `<button type="button" class="case-inspector-backdrop" data-close-inspector aria-label="Fechar painel"></button>${renderCaseInspector(caseData, { tab: activeTab })}`;
    root.appendChild(layer);
  }

  function close() {
    selectedCaseId = null;
    activeTab = 'summary';
    removeInspector();
  }

  root.addEventListener('click', event => {
    const inspectTarget = event.target.closest('[data-inspect-case]');
    if (inspectTarget) {
      selectedCaseId = inspectTarget.dataset.inspectCase;
      activeTab = 'summary';
      render();
      return;
    }

    const tabTarget = event.target.closest('[data-inspector-tab]');
    if (tabTarget && selectedCaseId) {
      activeTab = tabTarget.dataset.inspectorTab;
      render();
      return;
    }

    if (event.target.closest('[data-close-inspector]')) {
      close();
      return;
    }

    if (event.target.closest('[data-open-case]') && selectedCaseId) {
      close();
    }
  });

  const unsubscribe = store.subscribe(() => {
    if (selectedCaseId) render();
  });

  return {
    close,
    destroy() {
      close();
      unsubscribe();
    }
  };
}
