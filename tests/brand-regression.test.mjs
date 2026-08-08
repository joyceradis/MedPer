import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const icon = readFileSync(new URL('../icon.svg', import.meta.url), 'utf8');
const dashboardCss = readFileSync(new URL('../css/dashboard.css', import.meta.url), 'utf8');

test('uses a filled faceted polygon as the canonical logomark', () => {
  const polygonCount = (icon.match(/<polygon\b/g) || []).length;
  assert.ok(polygonCount >= 10, `expected faceted mark, found ${polygonCount} polygons`);
  assert.doesNotMatch(icon, /<path\b/);
  assert.match(icon, /<title id="title">MedPer<\/title>/);
  assert.match(icon, /viewBox="0 0 512 512"/);
});

test('keeps wordmark and approved three-stop sidebar color semantics', () => {
  assert.match(dashboardCss, /\.wordmark-med/);
  assert.match(dashboardCss, /var\(--medper-brand-ivory\)/);
  assert.match(dashboardCss, /\.wordmark-per/);
  assert.match(dashboardCss, /var\(--medper-brand-sky\)/);
  assert.match(
    dashboardCss,
    /linear-gradient\(180deg,var\(--medper-sidebar-top\).*var\(--medper-sidebar-mid\).*var\(--medper-sidebar-bottom\)/
  );
});

test('reserves danger styling for semantic indicators rather than whole cards', () => {
  assert.match(dashboardCss, /\.deadline-indicator\.is-danger/);
  assert.doesNotMatch(dashboardCss, /\.continue-card\.is-danger/);
  assert.doesNotMatch(dashboardCss, /\.dashboard-case-card\.is-danger/);
});

console.log('Brand regression suite completed successfully.');
