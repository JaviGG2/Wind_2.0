const CACHE_NAME = 'wind-{{CACHE_VERSION}}';
const ASSETS = [
    '/',
    '/css/base.css',
    '/css/home.css',
    '/css/menu.css',
    '/css/animations.css',
    '/js/menu.js',
    '/img/icon-192.png',
    '/img/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/auth/') ||
        event.request.url.includes('/admin/') ||
        event.request.url.includes('/juegos/')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => {
                return cache.match(event.request);
            });
        })
    );
});