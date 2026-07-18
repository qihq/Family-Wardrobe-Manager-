'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServerFixture } = require('./helpers/server-fixture');

test('canonical routes separate browsing, login, and protected management', async t => {
  const fx = await startServerFixture(t);
  let response = await fx.request('/view', { redirect: 'manual' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /data-ui="island"/);

  response = await fx.request('/login', { redirect: 'manual' });
  assert.equal(response.status, 200);
  let html = await response.text();
  assert.match(html, /data-page="login"/);
  assert.match(html, /id="standalone-login-form"/);

  for (const route of ['/admin', '/admin/login']) {
    response = await fx.request(route, { redirect: 'manual' });
    assert.equal(response.status, 302, route);
    assert.equal(response.headers.get('location'), '/login?next=%2Fadmin');
  }

  response = await fx.request('/classic/view');
  assert.equal(response.status, 200);
  html = await response.text();
  assert.match(html, /data-ui="classic"/);
  assert.match(html, /\/public\/shared\/ui-preference\.js/);
  assert.match(html, /data-switch-ui="island"/);

  response = await fx.request('/classic/admin', { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/classic/admin/login');

  await fx.request('/api/login', { method: 'POST', json: { password: 'test-password' } });
  response = await fx.request('/admin', { redirect: 'manual' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /data-ui="island"/);

  response = await fx.request('/classic/admin');
  assert.equal(response.status, 200);
  html = await response.text();
  assert.match(html, /data-ui="classic"/);
  assert.match(html, /data-switch-ui="island"/);

  response = await fx.request('/classic/admin/login');
  html = await response.text();
  assert.match(html, /data-switch-ui="island"/);
});

test('PWA entry files are served from root scope', async t => {
  const fx = await startServerFixture(t);
  let response = await fx.request('/manifest.webmanifest');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /manifest|json/);
  response = await fx.request('/sw.js');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('service-worker-allowed'), '/');
});

test('public config mount is never served as a static asset', async t => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /app\.get\('\/public\/config\.json',[\s\S]*sendStatus\(404\)/);
  const fx = await startServerFixture(t);
  const response = await fx.request('/public/config.json');
  assert.equal(response.status, 404);
});
