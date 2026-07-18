'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
  assert.match(await response.text(), /data-ui="classic"/);

  response = await fx.request('/classic/admin', { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/classic/admin/login');

  await fx.request('/api/login', { method: 'POST', json: { password: 'test-password' } });
  response = await fx.request('/classic/admin');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /data-ui="classic"/);
});
