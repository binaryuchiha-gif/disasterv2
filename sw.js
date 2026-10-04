/*
  sw.js
  Service worker: caches the app shell, data file, CDN libraries, and
  map tiles for offline use. Uses cache-first for tiles with a size
  limit, and cache-first with network fallback for the app shell.
*/

"use strict";

var SHELL_CACHE = "dm-shell-v1";
var TILE_CACHE = "dm-tiles-v1";
var MAX_TILE_ENTRIES = 300;

var SHELL_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./shelters.js",
  "./manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/lucide@latest/dist/umd/lucide.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(function (cache) {
        return Promise.all(
          SHELL_ASSETS.map(function (url) {
            return cache.add(url).catch(function () {
              /* ignore individual asset failures, e.g. offline install */
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== SHELL_CACHE && key !== TILE_CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function isTileRequest(url) {
  return (
    url.indexOf("basemaps.cartocdn.com") !== -1 ||
    url.indexOf("arcgisonline.com") !== -1 ||
    url.indexOf("server.arcgisonline.com") !== -1
  );
}

function trimTileCache(cache) {
  cache.keys().then(function (keys) {
    if (keys.length > MAX_TILE_ENTRIES) {
      var excess = keys.length - MAX_TILE_ENTRIES;
      for (var i = 0; i < excess; i++) {
        cache.delete(keys[i]);
      }
    }
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = request.url;

  // Routing API calls: always go to network, never cached.
  if (url.indexOf("router.project-osrm.org") !== -1) {
    return;
  }

  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(function (cache) {
        return cache.match(request).then(function (cached) {
          if (cached) return cached;
          return fetch(request)
            .then(function (response) {
              if (response && response.ok) {
                cache.put(request, response.clone());
                trimTileCache(cache);
              }
              return response;
            })
            .catch(function () {
              return (
                cached ||
                new Response("", { status: 504, statusText: "Offline and tile not cached" })
              );
            });
        });
      })
    );
    return;
  }

  // App shell and other assets: cache-first, fall back to network,
  // then update the cache in the background.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        fetch(request)
          .then(function (response) {
            if (response && response.ok) {
              caches.open(SHELL_CACHE).then(function (cache) {
                cache.put(request, response.clone());
              });
            }
          })
          .catch(function () {
            /* offline, keep serving cached copy */
          });
        return cached;
      }
      return fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            caches.open(SHELL_CACHE).then(function (cache) {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(function () {
          // Only fall back to the app shell for page navigations.
          // Script, style, and other asset requests should fail normally
          // so the page's own error handling (try/catch) can react,
          // instead of silently receiving HTML in place of the asset.
          if (request.mode === "navigate" || request.destination === "document") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline and asset not cached" });
        });
    })
  );
});
