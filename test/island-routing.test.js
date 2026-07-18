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

test('route state round trips unicode multi filters and guards admin sections', async () => {
  const { parseRoute, serializeRoute, isAllowedSection } = await import('../public/island/js/router.mjs');
  const route = parseRoute('?section=wardrobe&member=小明,小花&season=春&favorite=true&q=蓝色');
  assert.deepEqual(route.filters.member, ['小明', '小花']);
  assert.equal(parseRoute('?' + serializeRoute(route)).filters.q, '蓝色');
  assert.equal(isAllowedSection('add', false), false);
  assert.equal(isAllowedSection('add', true), true);
});
