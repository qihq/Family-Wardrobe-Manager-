'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('island shell exposes semantic responsive anchors', () => {
  const html = fs.readFileSync(path.join(root, 'public/island/index.html'), 'utf8');
  for (const id of ['sidebar-nav', 'tablet-nav', 'mobile-nav', 'main-view', 'filter-drawer', 'detail-dialog', 'confirm-dialog', 'toast-region']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /id="login-dialog"/);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /type="module" src="\/public\/island\/js\/app\.mjs"/);
  assert.doesNotMatch(html, /onclick=/);
});

test('icon buttons constrain asset dimensions to prevent viewport overflow', () => {
  const css = fs.readFileSync(path.join(root, 'public/island/styles/base.css'), 'utf8');
  assert.match(css, /\.island-icon-button\s+img\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/s);
});

test('hidden state always wins over component display styles', () => {
  const css = fs.readFileSync(path.join(root, 'public/island/styles/base.css'), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('each responsive shell exposes one consolidated system menu', () => {
  const html = fs.readFileSync(path.join(root, 'public/island/index.html'), 'utf8');
  assert.equal((html.match(/class="system-menu/g) || []).length, 3);
  assert.doesNotMatch(html, /account-login|switch-classic/);
  assert.match(html, /data-install-app/);
  assert.match(html, /data-classic-link/);
  assert.match(html, /data-auth-action/);
});

test('brand and PWA chrome use the Animal Island shopping icon, never the leaf', () => {
  const files = [
    'public/island/index.html',
    'public/island/login.html',
    'public/island/manifest.webmanifest'
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.match(files, /icon-shopping/);
  assert.doesNotMatch(files, /icon-leaf/);
});

test('standalone login has stable mobile sizing and no dialog shell', () => {
  const html = fs.readFileSync(path.join(root, 'public/island/login.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/island/styles/login.css'), 'utf8');
  assert.match(html, /data-page="login"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /autocomplete="current-password"/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /-webkit-text-size-adjust:\s*100%/);
});

test('wardrobe consolidates search and every filter family into one explorer', () => {
  const source = fs.readFileSync(path.join(root, 'public/island/js/wardrobe.mjs'), 'utf8');
  assert.match(source, /class="wardrobe-explorer island-panel"/);
  assert.match(source, /id="wardrobe-search"/);
  assert.match(source, /id="filter-count"/);
  assert.match(source, /data-clear-filters/);
  for (const name of ['member', 'type', 'season', 'status', 'favorite']) {
    assert.match(source, new RegExp(`name="${name}"`), name);
  }
  assert.doesNotMatch(source, /id="member-shortcuts"|id="type-shortcuts"/);
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

test('item form validates required values and builds compatible form data', async () => {
  const { validateItem, buildItemFormData, nextMobileStep } = await import('../public/island/js/item-form.mjs');
  assert.deepEqual(validateItem({ member: '', clothingType: '' }), { member: '请选择家庭成员', clothingType: '请选择衣物类型' });
  assert.equal(nextMobileStep(1, { clothingType: '' }), 1);
  assert.equal(nextMobileStep(1, { clothingType: '上衣' }), 2);
  const data = buildItemFormData({ member: '小明', clothingType: '上衣', seasons: ['春'], favorite: true }, { display: new Blob(['photo']), thumb: new Blob(['thumb']) });
  assert.equal(data.get('seasons'), '["春"]');
  assert.equal(data.get('favorite'), 'true');
  assert.equal(data.get('photo').name, 'photo.jpg');
  assert.equal(data.get('thumb').name, 'thumb.jpg');
});

test('mobile item flow starts at photo then advances to classification', async () => {
  const { nextMobileStep, stepControlVisibility } = await import('../public/island/js/item-form.mjs');
  assert.equal(nextMobileStep(0, {}), 1);
  assert.deepEqual(stepControlVisibility(0, false), { back: true, next: true, submit: false });
  assert.deepEqual(stepControlVisibility(0, true), { back: true, next: false, submit: true });
});

test('member-generated controls escape stored names', async () => {
  const { renderMemberShortcuts } = await import('../public/island/js/wardrobe.mjs');
  const { renderMemberOptions } = await import('../public/island/js/item-form.mjs');
  const member = { name: '"><img src=x onerror=alert(1)>' };
  for (const markup of [renderMemberShortcuts([member], []), renderMemberOptions([member])]) {
    assert.doesNotMatch(markup, /<img/);
    assert.match(markup, /&quot;&gt;&lt;img/);
  }
});

test('filter drawer selection mirrors route state', async () => {
  const { filterDrawerSelection } = await import('../public/island/js/wardrobe.mjs');
  assert.deepEqual(filterDrawerSelection({ season: ['春'], status: ['闲置'], favorite: true }), {
    season: new Set(['春']), status: new Set(['闲置']), favorite: true
  });
});

test('history and statistics selections reload wardrobe data', () => {
  const app = fs.readFileSync(path.join(root, 'public/island/js/app.mjs'), 'utf8');
  assert.match(app, /popstate[\s\S]*wardrobe\.loadClothes/);
  assert.match(app, /initStats\([\s\S]*api[\s\S]*onSelect[\s\S]*wardrobe\.loadClothes/);
});

test('mobile navigation lays out destinations horizontally', () => {
  const css = fs.readFileSync(path.join(root, 'public/island/styles/responsive.css'), 'utf8');
  assert.match(css, /\.mobile-nav\s+\.nav-list\s*\{[^}]*display:\s*flex[^}]*width:\s*100%/s);
});

test('statistics derive stored categories and map back to wardrobe filters', async () => {
  const { deriveStats, renderStatsGrid, statsFilter } = await import('../public/island/js/stats.mjs');
  const clothes = [
    { id: 'c1', member: '小明', clothingType: '上衣', status: '在用', seasons: ['四季'], favorite: true },
    { id: 'c2', member: '小花', clothingType: '鞋子', status: '闲置', seasons: ['春'], favorite: false }
  ];
  const stats = deriveStats(clothes, [{ id: 'm1', name: '小明' }, { id: 'm2', name: '小花' }]);
  assert.equal(stats.find(stat => stat.key === 'total').count, 2);
  assert.equal(stats.find(stat => stat.key === 'season:四季').count, 1);
  assert.equal(stats.find(stat => stat.key === 'season:春').count, 1);
  assert.deepEqual(statsFilter(stats.find(stat => stat.key === 'member:小明')), {
    section: 'wardrobe',
    filters: { q: '', member: ['小明'], type: [], season: [], status: [], favorite: false }
  });
  const error = renderStatsGrid([], '统计加载失败');
  assert.match(error, /role="alert"/);
  assert.match(error, /data-stats-retry/);
});

test('classic admin exposes a desktop switch to island UI', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8');
  const sidenav = html.slice(html.indexOf('class="sidenav-footer"'), html.indexOf('</aside>'));
  assert.match(sidenav, /data-switch-ui="island"/);
  assert.match(html, /querySelectorAll\('\[data-switch-ui="island"\]'\)/);
});
