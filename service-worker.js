const CACHE_NAME = 'legaltech-oaxaca-shell-v4';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(['./', './manifest.webmanifest', './icons/legaltech-icon.svg', './icons/emblema-legaltech.svg', './icons/legaltech-192.png', './icons/legaltech-512.png', './app-install.js']))
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
    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (request.mode !== 'navigate') {
        const cachedFiles = ['app-install.js', 'manifest.webmanifest', 'icons/legaltech-icon.svg', 'icons/emblema-legaltech.svg', 'icons/legaltech-192.png', 'icons/legaltech-512.png'];
        const cacheable = cachedFiles.some(path => url.href === new URL(path, self.registration.scope).href);
        if (cacheable) {
            event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(request)) || fetch(request)));
        }
        return;
    }

    const publicPages = ['./', './index.html', './legaltech_oaxaca.html']
        .map(path => new URL(path, self.registration.scope).href);
    if (!publicPages.includes(url.href)) {
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
