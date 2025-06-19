const CACHE_NAME = 'breathapp-v2.0.0';
const STATIC_CACHE = 'breathapp-static-v2.0.0';
const DYNAMIC_CACHE = 'breathapp-dynamic-v2.0.0';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/styles/extensions.css',
    '/js/app-extensions.js',
    '/modules/reminders.js',
    '/modules/breath-counter.js',
    '/modules/progress-tracker.js',
    '/modules/audio-guide.js',
    '/src/img/logo.svg',
    '/src/img/favicon.png',
    '/src/fonts/Audrey-Normal.otf',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.0/css/all.min.css'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.error('[SW] Cache failed:', err);
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
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
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
    
    if (request.method !== 'GET') return;
    
    // Skip chrome-extension, moz-extension and other non-http(s) requests
    if (!request.url.startsWith('http')) return;
    
    // Skip third-party scripts and ads
    if (request.url.includes('ads.') || 
        request.url.includes('google') || 
        request.url.includes('facebook') ||
        request.url.includes('analytics')) return;
    
    if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
        event.respondWith(cacheFirst(request));
    } else if (request.url.includes('/api/')) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

async function cacheFirst(request) {
    try {
        // Skip non-http requests
        if (!request.url.startsWith('http')) {
            return fetch(request);
        }
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Only cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        // Return a basic response for failed requests
        return new Response('Network error', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error('[SW] Network first failed:', error);
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Offline', { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        cache.put(request, networkResponse.clone());
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

self.addEventListener('backgroundsync', event => {
    if (event.tag === 'background-sync-sessions') {
        event.waitUntil(syncSessions());
    }
});

async function syncSessions() {
    try {
        const sessions = JSON.parse(localStorage.getItem('breathapp-pending-sync') || '[]');
        for (const session of sessions) {
            await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
        }
        localStorage.removeItem('breathapp-pending-sync');
        console.log('[SW] Background sync completed');
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Temps pour votre séance de cohérence cardiaque',
        icon: '/src/img/favicon.png',
        badge: '/src/img/favicon.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'start-session',
                title: 'Commencer',
                icon: '/src/img/favicon.png'
            },
            {
                action: 'snooze',
                title: 'Plus tard',
                icon: '/src/img/favicon.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('BreathApp', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const action = event.action;
    
    if (action === 'start-session') {
        event.waitUntil(
            clients.openWindow('/').then(client => {
                if (client) {
                    client.postMessage({ action: 'start-breathing' });
                }
            })
        );
    } else if (action === 'snooze') {
        setTimeout(() => {
            self.registration.showNotification('BreathApp - Rappel', {
                body: 'Il est temps de reprendre votre séance',
                icon: '/src/img/favicon.png'
            });
        }, 10 * 60 * 1000);
    } else {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});