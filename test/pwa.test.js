'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('manifest defines an installable standalone wardrobe app', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/island/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, '/view');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons.length >= 2, true);
  assert.equal(manifest.icons.every(icon => !icon.src.includes('leaf')), true);
  for (const icon of manifest.icons) {
    const file = path.join(root, icon.src.replace(/^\//, ''));
    assert.equal(fs.existsSync(file) && fs.statSync(file).size > 0, true, icon.src);
  }
});

test('service worker never caches APIs, photos, or configuration', () => {
  const worker = fs.readFileSync(path.join(root, 'public/island/sw.js'), 'utf8');
  assert.match(worker, /\/api\//);
  assert.match(worker, /\/photos\//);
  assert.match(worker, /config\.json/);
  assert.match(worker, /\/classic\/admin/);
  assert.match(worker, /fetch\(request\)/);
});

test('application and login pages register the root-scoped worker', () => {
  const registration = fs.readFileSync(path.join(root, 'public/island/js/pwa.mjs'), 'utf8');
  assert.match(registration, /register\('\/sw\.js'/);
  assert.match(registration, /beforeinstallprompt/);
  for (const file of ['public/island/index.html', 'public/island/login.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
    assert.match(html, /js\/pwa\.mjs/);
  }
});
