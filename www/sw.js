const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
  // כאן אפשר להוסיף קובצי CSS ו-JS נוספים שתרצה שיישמרו
];

// התקנת ה-Service Worker ושמירת הקבצים בזיכרון
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// שליפת הקבצים מהזיכרון כשאין אינטרנט
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});