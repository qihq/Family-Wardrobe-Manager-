'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServerFixture } = require('./helpers/server-fixture');

test('canonical routes serve island UI and classic routes keep authorization', async t => {
  const fx = await startServerFixture(t);
  for (const route of ['/view', '/admin', '/admin/login']) {
    const response = await fx.request(route, { redirect: 'manual' });
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), /data-ui="island"/);
  }

  let response = await fx.request('/classic/view');
  assert.equal(response.status, 200);
  let html = await response.text();
  assert.match(html, /data-ui="classic"/);
  assert.match(html, /\/public\/shared\/ui-preference\.js/);
  assert.match(html, /data-switch-ui="island"/);

  response = await fx.request('/classic/admin', { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/classic/admin/login');

  await fx.request('/api/login', { method: 'POST', json: { password: 'test-password' } });
  response = await fx.request('/classic/admin');
  assert.equal(response.status, 200);
  html = await response.text();
  assert.match(html, /data-ui="classic"/);
  assert.match(html, /data-switch-ui="island"/);

  response = await fx.request('/classic/admin/login');
  html = await response.text();
  assert.match(html, /data-switch-ui="island"/);
});

test('public config mount is never served as a static asset', async t => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /app\.get\('\/public\/config\.json',[\s\S]*sendStatus\(404\)/);
  const fx = await startServerFixture(t);
  const response = await fx.request('/public/config.json');
  assert.equal(response.status, 404);
});
