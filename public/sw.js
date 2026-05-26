const CACHE_NAME = 'wind-v3'; // Incrementado para invalidar caché previo de la API
const ASSETS = [
    '/',
    '/css/home.css',
    '/css/menu.css',
    '/css/animations.css',
    '/js/menu.js',
    '/img/icon-192.png',
    '/img/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0'
];

// Instalar el Service Worker y cachear recursos estáticos
self.addEventListener('install', (event) => {
    // Forzar que el Service Worker se active inmediatamente
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activar el Service Worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => {
            // Tomar el control de todas las pestañas abiertas inmediatamente
            return self.clients.claim();
        })
    );
});

// Estrategia: Stale-While-Revalidate
// Sirve desde caché para velocidad, pero actualiza en segundo plano para la próxima vez
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones dinámicas de API y autenticación para evitar falsos estados de sesión o cachés obsoletos
    if (event.request.url.includes('/auth/') || 
        event.request.url.includes('/admin/') || 
        event.request.url.includes('/juegos/')) {
        return; // Permite que la petición vaya directamente a la red
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Actualizar el caché con la respuesta de la red
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Si falla la red, ya devolvimos el caché (si existía)
                });

                // Devolver el caché si existe, de lo contrario esperar a la red
                return cachedResponse || fetchPromise;
            });
        })
    );
});
