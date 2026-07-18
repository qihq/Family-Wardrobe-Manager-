'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const assets = [
  'fonts/nunito-latin-500-normal.woff2',
  'fonts/nunito-latin-700-normal.woff2',
  'fonts/nunito-latin-900-normal.woff2',
  'fonts/noto-sans-sc-latin-400-normal.woff2',
  'fonts/noto-sans-sc-latin-500-normal.woff2',
  'fonts/noto-sans-sc-latin-700-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-400-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-500-normal.woff2',
  'fonts/noto-sans-sc-chinese-simplified-700-normal.woff2',
  'icons/icon-leaf.png',
  'icons/icon-shopping.svg',
  'icons/icon-camera.svg',
  'icons/icon-map.svg',
  'icons/icon-miles.svg',
  'icons/icon-design.svg',
  'icons/icon-variant.svg',
  'dividers/divider-line-brown.svg',
  'dividers/divider-line-teal.svg',
  'dividers/divider-line-yellow.svg',
  'dividers/wave-yellow.svg'
];

test('licensed island assets are vendored locally', () => {
  const missing = assets.filter(relative => {
    const file = path.join(root, 'public', 'island', 'assets', relative);
    return !fs.existsSync(file) || fs.statSync(file).size === 0;
  });
  assert.deepEqual(missing, []);
});

test('third party notice records source license and modifications', () => {
  const notice = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notice, /github\.com\/guokaigdg\/animal-island-ui/);
  assert.match(notice, /guokaigdg/);
  assert.match(notice, /CC BY-NC 4\.0/);
  assert.match(notice, /non-commercial/i);
  assert.match(notice, /modified/i);
});
