const CACHE_NAME = 'wardrobe-island-v2';
const APP_SHELL = [
  '/view',
  '/login',
  '/manifest.webmanifest',
  '/public/island/styles/tokens.css',
  '/public/island/styles/base.css',
  '/public/island/styles/app.css',
  '/public/island/styles/responsive.css',
  '/public/island/styles/login.css',
  '/public/island/assets/icons/icon-shopping.svg',
  '/public/island/assets/icons/icon-design.svg',
  '/public/island/assets/icons/icon-diy.svg',
  '/public/island/assets/icons/icon-variant.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const bypass = request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/classic/admin') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/') || url.pathname.toLowerCase().endsWith('/config.json');
  if (bypass) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('/view'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
