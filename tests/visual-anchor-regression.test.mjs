import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const design = readFileSync(new URL('../css/design-system.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../css/dashboard.css', import.meta.url), 'utf8');
const authCss = readFileSync(new URL('../css/auth.css', import.meta.url), 'utf8');
const authJs = readFileSync(new URL('../js/auth/auth-controller.js', import.meta.url), 'utf8');
const icon = readFileSync(new URL('../icon.svg', import.meta.url), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('uses the dark institutional navy family from the approved mockup', () => {
  assert.match(design, /--medper-sidebar-top:#173f72/i);
  assert.match(design, /--medper-sidebar-mid:#0d3159/i);
  assert.match(design, /--medper-sidebar-bottom:#071d37/i);
  assert.match(design, /--medper-accent:#123f6b/i);
  assert.doesNotMatch(design, /#2e73bd|#124f8b/i);
});

test('keeps Med ivory and Per institutional sky without using alert red in the wordmark', () => {
  assert.match(design, /--medper-wordmark-med:#f4f0e8/i);
  assert.match(design, /--medper-wordmark-per:#8fc9e8/i);
  assert.match(dashboard, /\.wordmark-med/);
  assert.match(dashboard, /\.wordmark-per/);
});

test('uses the canonical faceted mark consistently in auth and dashboard', () => {
  assert.ok((icon.match(/<polygon\b/g) || []).length >= 16);
  assert.match(authJs, /class="auth-logomark" src="\.\/icon\.svg"/);
  assert.doesNotMatch(authJs, /class="brand-mark">M</);
  assert.match(authJs, /wordmark-med/);
  assert.match(authJs, /wordmark-per/);
});

test('auth is part of the same MedPer design system and contains no legacy green setup surface', () => {
  assert.match(authCss, /var\(--medper-sidebar-bottom\)/);
  assert.match(authCss, /var\(--medper-brand-ivory\)/);
  assert.match(authCss, /var\(--medper-brand-sky\)/);
  assert.doesNotMatch(authCss, /#eef5f1|#29483f|#263d37|35,57,52/);
});

test('development auth does not expose infrastructure configuration instructions to the user', () => {
  assert.doesNotMatch(authJs, /Preencha js\/config\/supabase-config\.js/i);
  assert.doesNotMatch(authJs, /service_role key no navegador/i);
  assert.match(authJs, /Acesso online ainda não ativado/);
  assert.match(authJs, /Continuar em modo local/);
});

test('dashboard keeps restrained institutional density rather than bright SaaS styling', () => {
  assert.match(dashboard, /linear-gradient\(180deg,var\(--medper-sidebar-top\).*var\(--medper-sidebar-bottom\)/);
  assert.match(dashboard, /background:var\(--medper-sidebar-bottom\)/);
  assert.doesNotMatch(dashboard, /background:#2e73bd|background:#124f8b/i);
});

console.log('Visual anchor regression suite completed successfully.');
