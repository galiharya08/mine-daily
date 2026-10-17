const CACHE_NAME = 'mine-planner-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Tahap Install: Simpan aset utama ke dalam cache offline
self.addEventListener('install', event => {
  self.skipWaiting(); // Langsung aktifkan SW baru tanpa menunggu tab ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Tahap Activate: Hapus cache versi lama secara otomatis
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Tahap Fetch: Network-First untuk halaman utama (agar update kode langsung masuk),
// dan Cache-First untuk aset pendukung (agar cepat & tahan offline)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Untuk file HTML / navigasi utama, utamakan ambil terbaru dari internet,
  // jika sedang offline baru ambil dari cache
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match(event.request))
    );
    return;
  }

  // Untuk gambar, font, dan manifest: ambil dari cache dulu, sambil perbarui di latar belakang
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});