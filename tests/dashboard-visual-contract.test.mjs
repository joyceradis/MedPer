import assert from 'node:assert/strict';
import fs from 'node:fs';

const view = fs.readFileSync(new URL('../js/ui/dashboard-view.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/dashboard.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

for (const required of [
  'Perita do juízo',
  'Etapa 5 de 9',
  'Revisão de Documentos',
  'Exame',
  'Laudo',
  'Próximos prazos',
  'Ver pendências',
  'shortcut-action',
  'deadline-indicator',
  'pending-icon'
]) assert.ok(view.includes(required), `dashboard-view.js deve conter: ${required}`);

for (const required of [
  '.dashboard-shortcuts button',
  '.shortcut-action',
  '.continue-progress-track',
  '.continue-milestones',
  '.deadline-indicator',
  '.deadline-date',
  '.dashboard-pending',
  '.dashboard-pending-action'
]) assert.ok(css.includes(required), `dashboard.css deve conter: ${required}`);

assert.ok(app.includes('font-awesome/6.7.2/css/all.min.css'), 'Font Awesome deve estar carregado');
assert.ok(app.includes('dashboard.css?v=20260808.5'), 'dashboard.css deve usar a versão visual atual');

console.log('dashboard visual contract: ok');
