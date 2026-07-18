'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWardrobeApp } = require('../../server');

async function startServerFixture(t, seed = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wardrobe-test-'));
  const dataDir = path.join(root, 'data');
  const photoBaseDir = path.join(root, 'photos');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(photoBaseDir, { recursive: true });

  const wardrobeFile = path.join(dataDir, 'wardrobe.json');
  const membersFile = path.join(dataDir, 'members.json');
  fs.writeFileSync(wardrobeFile, JSON.stringify(seed.clothes || []));
  fs.writeFileSync(membersFile, JSON.stringify(seed.members || []));

  const app = createWardrobeApp({
    config: {
      adminPassword: 'test-password',
      sessionSecret: 'test-secret',
      photoBaseDir
    },
    dataDir,
    photoBaseDir,
    logger: { log() {}, error() {} }
  });
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (cookie) headers.set('cookie', cookie);
    let body = options.body;
    if (options.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.json);
    }
    const response = await fetch(baseUrl + url, { ...options, headers, body });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';', 1)[0];
    return response;
  }

  return {
    baseUrl,
    request,
    paths: { root, dataDir, photoBaseDir, wardrobeFile, membersFile }
  };
}

module.exports = { startServerFixture };
