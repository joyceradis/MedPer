function closestDialog(target) {
  return target instanceof Element ? target.closest('dialog') : null;
}

function isDismissControl(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-close], [data-cancel], button[value="cancel"]'));
}

export function installDialogController(doc = document) {
  doc.addEventListener('click', event => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-close], [data-cancel], button[value="cancel"]')
      : null;

    if (!trigger || !isDismissControl(trigger)) return;

    const dialog = closestDialog(trigger);
    if (!dialog) return;

    event.preventDefault();
    event.stopPropagation();
    dialog.close('cancel');
  }, true);

  doc.addEventListener('click', event => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    const dialog = event.target;
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close('cancel');
  });
}
