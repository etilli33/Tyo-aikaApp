//service worker recipe from serviceworke.rs to caching and updating cache later in the background
var CACHE = 'cache-and-update';

self.addEventListener('install', function(evt) {
  console.log('The service worker is being installed.');

  evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
  console.log('The service worker is serving the asset.');
  evt.respondWith(fromCache(evt.request));
  evt.waitUntil(update(evt.request));
});

function precache() {
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll([
      '/Tyo-aikaApp/',
      '/Tyo-aikaApp/app.js',
      '/Tyo-aikaApp/index.html',
      '/Tyo-aikaApp/style.css',
      '/Tyo-aikaApp/images/icons-192.png'
    ]);
  });
}


function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    });
  });
}

function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}
/*
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
*/

  //to have a new service worker registered, let it store a new cache eg. 'vs2'
  //it will be activated when no page is needing the old sw anymore.
  //To remove old caches:

  /*
self.addEventListener('activate', (event) => {
  var cacheKeeplist = ['v2'];

  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (cacheKeeplist.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    })
  );
});
  */