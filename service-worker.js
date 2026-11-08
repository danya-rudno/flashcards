
const CACHE_NAME = "flashcards-v6";

const APP_FILES = [
  "./",
  "./manifest.json"
];

// 1. Встановлення Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// 2. Активація та очищення старого кешу
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("flashcards-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// 3. Обробка запитів до ресурсів
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Працюємо тільки з GET-запитами до нашого сайту
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Для відкриття сторінки спочатку пробуємо інтернет,
  // а якщо його немає — використовуємо кеш
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./", copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (await caches.match("./")) ||
            new Response("Немає підключення до інтернету.", {
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
        })
    );

    return;
  }

  // Для інших ресурсів спочатку перевіряємо кеш
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }

        return response;
      });
    })
  );
});
