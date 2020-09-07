console.log('Service-worker started.');

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('tyoaika').then(function(cache) {
        return cache.addAll([
          // your list of cache keys to store in cache
          'app.js',
          'index.html',
          'style.css',
          'images/icons-192.png'
          // etc.
        ])
      })
    );
  });