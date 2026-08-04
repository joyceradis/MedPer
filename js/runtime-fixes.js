(() => {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => {
    const match = location.hash.match(/^#\/case\/([^/]+)\/(summary|documents|assessment|analysis|questions|report)$/);
    if (!match) return;
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-open-case="${CSS.escape(match[1])}"]`);
      card?.click();
      requestAnimationFrame(() => document.querySelector(`[data-tab="${match[2]}"]`)?.click());
    });
  });
})();
