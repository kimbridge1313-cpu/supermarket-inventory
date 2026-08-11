const CACHE_NAME = 'supermarket-inventory-shell-v4';
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/app-icon-192-v3.png',
  '/icons/app-icon-512-v3.png',
  '/icons/app-icon-maskable-192-v3.png',
  '/icons/app-icon-maskable-512-v3.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('supermarket-inventory-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isNetworkOnly(url, request) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith('/api/')) return true;
  return false;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put('/', response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match('/');
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isNetworkOnly(url, request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const cacheableDestination = new Set(['script', 'style', 'image', 'font', 'manifest']);
  if (cacheableDestination.has(request.destination)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
