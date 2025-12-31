// Service Worker для Lofi Radio PWA
const CACHE_NAME = 'lofi-radio-v1';
const urlsToCache = [
  '/',
  '/ru/',
  '/en/',
  '/styles.css',
  '/script.js',
  '/translations.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/images/background.jpg',
  '/assets/images/background-newyear.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Ошибка кеширования', error);
      })
  );
  self.skipWaiting(); // Активируем сразу
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Удаление старого кеша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Берем контроль над всеми страницами
});

// Перехват запросов - стратегия Cache First для аудио, Network First для остального
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Для аудио файлов используем Cache First стратегию (офлайн работа)
  if (url.pathname.includes('.mp3') || event.request.destination === 'audio') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Если есть в кеше, возвращаем из кеша
          if (cachedResponse) {
            // В фоне обновляем кеш для следующего раза
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
                }
              })
              .catch(() => {
                // Игнорируем ошибки обновления кеша
              });
            return cachedResponse;
          }
          
          // Если нет в кеше, загружаем из сети и кешируем
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // Если сеть недоступна и нет в кеше, возвращаем ошибку
              return new Response('Audio file not available offline', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
    return;
  }

  // Для остальных файлов используем Network First стратегию
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Клонируем ответ для кеша
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          // Кешируем только успешные GET запросы
          if (event.request.method === 'GET' && response.status === 200) {
            cache.put(event.request, responseToCache);
          }
        });
        
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, используем кеш
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Если нет в кеше, возвращаем базовую страницу
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

