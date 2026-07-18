'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('island shell exposes semantic responsive anchors', () => {
  const html = fs.readFileSync(path.join(root, 'public/island/index.html'), 'utf8');
  for (const id of ['sidebar-nav', 'tablet-nav', 'mobile-nav', 'main-view', 'login-dialog', 'filter-drawer', 'detail-dialog', 'confirm-dialog', 'toast-region']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /type="module" src="\/public\/island\/js\/app\.mjs"/);
  assert.doesNotMatch(html, /onclick=/);
});

test('navigation inventory follows authorization', async () => {
  const { getNavItems } = await import('../public/island/js/constants.mjs');
  assert.deepEqual(getNavItems(false).map(item => item.section), ['wardrobe']);
  assert.deepEqual(getNavItems(true).map(item => item.section), ['wardrobe', 'add', 'members', 'stats']);
});
