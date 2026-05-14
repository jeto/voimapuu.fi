const CACHE_VERSION = 'v1';
const CACHE = `voimapuu-2026-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/2026/',
    '/2026/index.html',
    '/2026/style.css',
    '/2026/app.js',
    '/2026/artists.json',
    '/2026/mainstage.webp',
    '/2026/icon.png',
    '/fonts/Pilowlava-Regular.woff2',
    '/fonts/Pilowlava-Atome.woff2',
    '/fonts/Doto-VariableFont_ROND,wght.ttf',
    'https://cdn.jsdelivr.net/npm/p5@1.11.2/lib/p5.min.js',
];

// Always fetch fresh, cache is fallback only
const NETWORK_FIRST_PATTERNS = [
    '/2026/index.html',
    '/2026/',
    '/2026/artists.json',
    'docs.google.com',
];

function matchesPatterns(url, patterns) {
    return patterns.some(p => url.includes(p));
}

async function getArtistImages() {
    try {
        const res = await fetch('/2026/artists.json');
        const artists = await res.json();
        return artists.flatMap(a => [
            a.image && `/2026/${a.image}`,
            a.thumbnail && `/2026/${a.thumbnail}`,
        ].filter(Boolean));
    } catch (e) {
        return [];
    }
}

self.addEventListener('install', e => {
    e.waitUntil(
        getArtistImages()
            .then(images => caches.open(CACHE)
                .then(cache => cache.addAll([...STATIC_ASSETS, ...images])))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    const url = e.request.url;

    if (matchesPatterns(url, NETWORK_FIRST_PATTERNS)) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        e.respondWith(
            caches.match(e.request)
                .then(cached => cached || fetch(e.request).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                    return res;
                }))
        );
    }
});
