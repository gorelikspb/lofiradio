// Service Worker для Lofi Radio PWA
const CACHE_NAME = 'lofi-radio-v2'; // Обновлена версия для принудительного обновления
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

// Перехват запросов - стратегия Network First для всех файлов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Пропускаем аудио файлы - пусть загружаются напрямую без перехвата
  // Это предотвращает проблемы с кешированием и QUIC протоколом
  if (url.pathname.includes('.mp3') || event.request.destination === 'audio') {
    return; // Не перехватываем аудио запросы
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

