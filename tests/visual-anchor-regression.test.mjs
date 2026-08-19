import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// This suite intentionally protects only non-visual safety/brand invariants.
// Palette, typography, gradients, radii, shadows and layout are free to evolve.
const authJs = readFileSync(new URL('../js/auth/auth-controller.js', import.meta.url), 'utf8');
const icon = readFileSync(new URL('../icon.svg', import.meta.url), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('keeps an explicit MedPer logomark asset', () => {
  assert.match(icon, /<title id="title">MedPer<\/title>/);
  assert.match(icon, /viewBox=/);
});

test('development auth does not expose infrastructure configuration instructions to the user', () => {
  assert.doesNotMatch(authJs, /Preencha js\/config\/supabase-config\.js/i);
  assert.doesNotMatch(authJs, /service_role key no navegador/i);
  assert.match(authJs, /Acesso online ainda não ativado/);
  assert.match(authJs, /Continuar em modo local/);
});

console.log('Non-visual product anchor regression suite completed successfully.');
