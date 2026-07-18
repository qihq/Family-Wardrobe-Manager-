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
