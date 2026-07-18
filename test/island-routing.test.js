'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('classic preference maps canonical URL and preserves filters', async () => {
  const { resolveUiTarget } = await import('../public/island/js/preference.mjs');
  assert.equal(
    resolveUiTarget({ url: new URL('http://x/view?member=小明'), storedPreference: 'classic' }),
    '/classic/view?member=%E5%B0%8F%E6%98%8E'
  );
});

test('explicit island preference maps classic URL without a loop', async () => {
  const { resolveUiTarget } = await import('../public/island/js/preference.mjs');
  assert.equal(
    resolveUiTarget({ url: new URL('http://x/classic/view?ui=island&type=外套'), storedPreference: 'classic' }),
    '/view?type=%E5%A4%96%E5%A5%97'
  );
  assert.equal(
    resolveUiTarget({ url: new URL('http://x/view?ui=island'), storedPreference: 'classic' }),
    null
  );
});

test('island switch preserves public and management route context', async () => {
  const { toClassicPath } = await import('../public/island/js/preference.mjs');
  assert.equal(toClassicPath(new URL('http://x/admin?section=members')), '/classic/admin?section=members');
  assert.equal(toClassicPath(new URL('http://x/admin/login?next=members')), '/classic/admin/login?next=members');
});

test('route state round trips unicode multi filters and guards admin sections', async () => {
  const { parseRoute, serializeRoute, isAllowedSection, shouldResetScroll } = await import('../public/island/js/router.mjs');
  const route = parseRoute('?section=wardrobe&member=小明,小花&season=春&favorite=true&q=蓝色');
  assert.deepEqual(route.filters.member, ['小明', '小花']);
  assert.equal(parseRoute('?' + serializeRoute(route)).filters.q, '蓝色');
  assert.equal(isAllowedSection('add', false), false);
  assert.equal(isAllowedSection('add', true), true);
  assert.equal(shouldResetScroll({ section: 'wardrobe' }, { section: 'add' }), true);
  assert.equal(shouldResetScroll({ section: 'wardrobe' }, { section: 'wardrobe' }), false);
});

test('admin paths request management login for logged out visitors', async () => {
  const { shouldOpenLoginForPath } = await import('../public/island/js/auth.mjs');
  assert.equal(shouldOpenLoginForPath('/admin', false), true);
  assert.equal(shouldOpenLoginForPath('/admin/login', false), true);
  assert.equal(shouldOpenLoginForPath('/view', false), false);
  assert.equal(shouldOpenLoginForPath('/admin', true), false);
});
