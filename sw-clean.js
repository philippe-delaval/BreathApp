const CACHE_NAME = 'breathapp-v2.0.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/styles/extensions.css',
    '/src/img/logo.svg',
    '/manifest-clean.json'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.warn('[SW] Cache failed:', err);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Only handle GET requests for our domain
    if (request.method !== 'GET') return;
    if (!request.url.startsWith(self.location.origin)) return;
    
    // Skip requests with search params (avoid caching dynamic content)
    if (request.url.includes('?')) return;
    
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(request)
                    .then(fetchResponse => {
                        // Only cache successful responses from our origin
                        if (fetchResponse.status === 200 && 
                            fetchResponse.type === 'basic') {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        return fetchResponse;
                    })
                    .catch(() => {
                        // Return cached index.html for navigation requests when offline
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});