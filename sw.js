//console.log('Service-worker started.');

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('tyoaika').then(function(cache) {
        return cache.addAll([
          // your list of cache keys to store in cache
          '/Tyo-aikaApp/',
          '/Tyo-aikaApp/app.js',
          '/Tyo-aikaApp/index.html',
          '/Tyo-aikaApp/style.css',
          '/Tyo-aikaApp/images/icons-192.png'
        ]);
      })
    );
  });