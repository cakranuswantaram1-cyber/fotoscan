const CACHE_PREFIX = 'fotoscan-';
const CACHE_NAME = CACHE_PREFIX + 'v4'; // naikkan (v5, v6, ...) HANYA bila menambah/mengganti file di ASSETS
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
// Pustaka PDF (CDN) disimpan juga supaya Alat PDF dan "Ambil dari file PDF" bisa offline.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    // CDN bersifat opsional: gagal (offline saat pasang) tidak membatalkan instalasi.
    await Promise.all(CDN_ASSETS.map((u) => cache.add(u).catch(() => {})));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Hanya hapus cache lama milik FotoScan; cache aplikasi lain di domain yang sama dibiarkan.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // File milik aplikasi (HTML, ikon, manifest): INTERNET DULU supaya update otomatis terambil.
  // Bila offline/gagal, pakai salinan di cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // Pustaka CDN (versinya tetap): cache dulu biar cepat dan hemat kuota.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => cached))
  );
});
