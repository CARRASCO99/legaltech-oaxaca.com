const CACHE_NAME = 'legaltech-oaxaca-shell-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(['./', './manifest.webmanifest', './icons/legaltech-icon.svg']))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key.startsWith('legaltech-oaxaca-shell-') && key !== CACHE_NAME)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin || request.mode !== 'navigate') {
        return;
    }

    event.respondWith(
        fetch(request).then(async response => {
            if (response.ok) {
                await caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
            }
            return response;
        }).catch(async () => (await caches.match(request)) || caches.match('./'))
    );
});
