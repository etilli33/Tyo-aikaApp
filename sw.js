//console.log('Service-worker started.');

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('tyoaika1').then(function(cache) {
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

  self.addEventListener('fetch', function(event) {
    event.respondWith(caches.match(event.request).then(function(response) {
      // caches.match() always resolves
      // but in case of success response will have value
      if (response !== undefined) {
        return response;
      } else {
        return fetch(event.request).then(function (response) {
          // response may be used only once
          // we need to save clone to put one copy in cache
          // and serve second one
          let responseClone = response.clone();
          
          caches.open('tyoaika1').then(function (cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
      }
    }));
  });

  //to have a new service worker registered, let it store a new cache eg. 'vs2'
  //it will be activated when no page is needing the old sw anymore.