'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('standalone Docker image exposes the same health check as Compose', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');

  assert.match(dockerfile, /^HEALTHCHECK\s+/m);
  assert.match(dockerfile, /http:\/\/localhost:3000\/api\/members/);
});
