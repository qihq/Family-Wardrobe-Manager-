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

test('clothing cards escape user content and separate visitor/admin actions', async () => {
  const { renderClothesCard } = await import('../public/island/js/render.mjs');
  const item = {
    id: 'c1', name: '<script>alert(1)</script>', clothingType: '外套', member: '小明',
    status: '在用', seasons: ['春'], favorite: true, photoPath: '/photos/full.jpg', thumbPath: '/photos/thumb.jpg'
  };
  const visitor = renderClothesCard(item, { isAdmin: false });
  assert.doesNotMatch(visitor, /<script>/);
  assert.match(visitor, /src="\/photos\/thumb\.jpg"/);
  assert.match(visitor, /alt="&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  assert.doesNotMatch(visitor, /data-action="favorite"/);
  const admin = renderClothesCard(item, { isAdmin: true });
  assert.match(admin, /data-action="favorite"/);
  assert.match(admin, /aria-label="取消收藏/);
});

test('active filters have labelled removal controls and collection states are distinct', async () => {
  const { renderActiveFilters, renderCollectionState } = await import('../public/island/js/render.mjs');
  const filters = renderActiveFilters({ q: '蓝色', member: ['小明'], type: [], season: ['春'], status: [], favorite: true });
  assert.match(filters, /移除人员筛选：小明/);
  assert.match(filters, /清除搜索：蓝色/);
  assert.match(renderCollectionState('empty', '衣橱还是空的'), /data-state="empty"/);
  assert.match(renderCollectionState('error', '加载失败'), /role="alert"/);
});
