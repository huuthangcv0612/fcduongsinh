// ============================================================
// FC Nhà Trẻ - Service Worker
// Strategy: Workbox precache (build-injected) + custom Push handlers
// ============================================================

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

// Injected at build time by vite-plugin-pwa (injectManifest strategy)
precacheAndRoute(self.__WB_MANIFEST);

// SPA offline fallback for navigations, skipping API/auth routes
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  })
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
    .catch(err => console.error('[SW] showNotification error:', err));

  const messagePromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'NEW_NOTIFICATION', data });
        } catch(e) {}
      });
    })
    .catch(err => console.error('[SW] postMessage error:', err));

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
