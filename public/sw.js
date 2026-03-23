// Service Worker — PWA + Web Push Notifications
const CACHE_NAME = 'user-pwa-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/assets/images/pwa.svg',
    '/assets/images/pwa.png',
    '/manifest.json',
];

// ── Install: Pre-cache shell ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// ── Activate: Clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ── Fetch: Network-first for navigations, cache-first for assets ─────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET and API/socket requests
    if (request.method !== 'GET') return;
    if (request.url.includes('/api/') || request.url.includes('/socket.io')) return;

    // Navigation requests → network-first, fallback to offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Static assets → cache-first
    event.respondWith(
        caches.match(request).then((cached) => {
            return cached || fetch(request).then((response) => {
                // Cache successful responses for static assets
                if (response.ok && (request.url.match(/\.(css|js|woff2?|png|svg|jpg|ico)$/))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body || '',
            icon: data.icon || '/assets/images/pwa.png',
            badge: '/assets/images/pwa.png',
            data: { url: data.url || '/portal' },
            vibrate: [100, 50, 100],
            tag: 'user-notification',
            renotify: true,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'User', options)
        );
    } catch (err) {
        console.error('[SW] Error processing push:', err);
    }
});

// ── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/portal';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes('/portal') && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
