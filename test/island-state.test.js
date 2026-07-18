'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('store updates immutably and notifies once', async () => {
  const { createStore } = await import('../public/island/js/state.mjs');
  const initial = { count: 0 };
  const store = createStore(initial);
  let calls = 0;
  store.subscribe(() => { calls += 1; });
  store.setState(state => ({ ...state, count: state.count + 1 }));
  assert.equal(initial.count, 0);
  assert.equal(store.getState().count, 1);
  assert.equal(calls, 1);
});

test('api error retains response status and payload', async () => {
  const { ApiError } = await import('../public/island/js/api.mjs');
  const error = new ApiError('请先登录', 401, { success: false });
  assert.equal(error.status, 401);
  assert.deepEqual(error.payload, { success: false });
});
