/**
 * Minimal PWA service worker: caches the app shell for offline load,
 * and handles incoming Web Push notifications (background sync of new
 * messages happens via the SSE connection while the tab is open; push
 * notifications cover the "app closed" case).
 */
const CACHE_NAME = 'tg-clone-shell-v1';
const SHELL_ASSETS = ['/', '/chats', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for API calls (always fresh data); cache-first for the app shell.
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => cached as Response),
    ),
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New message', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/chats' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/chats'));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    // Placeholder hook for background sync of queued outgoing messages
    // created while offline (queue is populated client-side via IndexedDB
    // in a future iteration).
  }
});
