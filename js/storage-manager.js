(() => {
  'use strict';
  
  const DEBOUNCE_DELAY = 2000; // 2 seconds
  let saveTimer = null;
  let pendingChanges = false;
  
  function debounce(fn, delay) {
    return function(...args) {
      clearTimeout(saveTimer);
      pendingChanges = true;
      saveTimer = setTimeout(() => {
        fn.apply(this, args);
        pendingChanges = false;
      }, delay);
    };
  }
  
  function debouncedSave(saveCallback) {
    return debounce(saveCallback, DEBOUNCE_DELAY);
  }
  
  function hasPendingChanges() {
    return pendingChanges;
  }
  
  function flushPending(saveCallback) {
    if (pendingChanges) {
      clearTimeout(saveTimer);
      saveCallback();
      pendingChanges = false;
    }
  }
  
  window.StorageManager = { debouncedSave, hasPendingChanges, flushPending, DEBOUNCE_DELAY };
})();