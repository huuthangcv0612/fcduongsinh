// ============================================================
// FC Nhà Trẻ - Service Worker
// Strategy: Network First for API, Cache First for static assets
// ============================================================

const CACHE_NAME = 'fcnhatre-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// API routes - always skip cache, go to network
const API_PATTERNS = [
  /\/api\//,
  /accounts\.google\.com/,
  /googleapis\.com/,
  /mongodb/,
  /apify/,
  /generativelanguage/,
];

function isApiRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url));
}

// ---- INSTALL: Pre-cache static shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE: Clean old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ---- FETCH: Network-first for APIs, Cache-first for static ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET requests (POST, PUT, DELETE etc.)
  if (request.method !== 'GET') return;

  // Skip browser extension requests
  if (!url.startsWith('http')) return;

  // Skip API / Auth / Dynamic requests - always fetch from network
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests (HTML pages), Network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline fallback
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached index
          return caches.match('/') || caches.match(request);
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type !== 'opaque') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => {
        // Return cached version if network fails
        return caches.match(request);
      });
    })
  );
});

// ============================================================
// Web Push Notification Handlers
// ============================================================

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Thông báo', body: event.data.text() };
    }
  }

  const title = data.title || 'FC Nhà Trẻ';
  const options = {
    body: data.body || 'Bạn có một thông báo mới.',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  const notificationPromise = self.registration.showNotification(title, options)
    .catch(err => console.error('[SW] Lỗi showNotification:', err));

  const messagePromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'NEW_NOTIFICATION', data });
        } catch(e) {}
      });
    })
    .catch(err => console.error('[SW] Lỗi postMessage:', err));

  event.waitUntil(Promise.all([notificationPromise, messagePromise]));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

