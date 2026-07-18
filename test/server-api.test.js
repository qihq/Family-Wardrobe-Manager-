'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { startServerFixture } = require('./helpers/server-fixture');
const { resolveRuntimePath } = require('../server');

test('relative runtime paths resolve from the application directory', () => {
  assert.equal(resolveRuntimePath('./photos', 'photos'), require('node:path').join(require('node:path').resolve(__dirname, '..'), 'photos'));
});

test('visitor filters and admin completes clothing mutations', async t => {
  const fx = await startServerFixture(t, {
    members: [{ id: 'm1', name: '小明' }, { id: 'm2', name: '小花' }],
    clothes: [
      { id: 'c1', name: '雨衣', clothingType: '外套', member: '小明', status: '在用', seasons: ['春'], favorite: false, createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'c2', name: '凉鞋', clothingType: '鞋子', member: '小花', status: '闲置', seasons: ['夏'], favorite: true, createdAt: '2026-01-01T00:00:00.000Z' }
    ]
  });

  let response = await fx.request('/api/clothes?member=小明&type=外套');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map(item => item.id), ['c1']);
  assert.equal((await fx.request('/api/clothes/c1/favorite', { method: 'PATCH' })).status, 401);

  response = await fx.request('/api/login', { method: 'POST', json: { password: 'test-password' } });
  assert.equal(response.status, 200);

  const create = new FormData();
  Object.entries({ member: '小明', clothingType: '上衣', name: '条纹衫', status: '在用', seasons: '["四季"]' })
    .forEach(([key, value]) => create.set(key, value));
  const created = await (await fx.request('/api/clothes', { method: 'POST', body: create })).json();

  response = await fx.request(`/api/clothes/${created.id}/favorite`, { method: 'PATCH' });
  assert.equal((await response.json()).favorite, true);

  const update = new FormData();
  Object.entries({ member: '小花', clothingType: '上衣', name: '条纹长袖' })
    .forEach(([key, value]) => update.set(key, value));
  response = await fx.request(`/api/clothes/${created.id}`, { method: 'PUT', body: update });
  assert.equal((await response.json()).name, '条纹长袖');

  response = await fx.request(`/api/clothes/${created.id}`, { method: 'DELETE' });
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(JSON.parse(fs.readFileSync(fx.paths.wardrobeFile, 'utf8')).some(item => item.id === created.id), false);
});

test('member rename cascades and occupied deletion is rejected', async t => {
  const fx = await startServerFixture(t, {
    members: [{ id: 'm1', name: '小明' }],
    clothes: [{ id: 'c1', name: '外套', clothingType: '外套', member: '小明', status: '在用', seasons: [], createdAt: '2026-01-01T00:00:00.000Z' }]
  });
  await fx.request('/api/login', { method: 'POST', json: { password: 'test-password' } });
  let response = await fx.request('/api/members/m1', { method: 'PUT', json: { name: '明明' } });
  assert.equal((await response.json()).name, '明明');
  assert.equal(JSON.parse(fs.readFileSync(fx.paths.wardrobeFile, 'utf8'))[0].member, '明明');
  response = await fx.request('/api/members/m1', { method: 'DELETE' });
  assert.equal(response.status, 400);
});
