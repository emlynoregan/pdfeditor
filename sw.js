const CACHE_NAME = 'pdf-editor-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/pdf-editor.css',
  '/js/storage.js',
  '/js/pdf-handler.js',
  '/js/ui-manager.js',
  '/js/main.js',
  '/assets/images/favicon.png',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page for HTML requests
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New PDF Editor notification',
    icon: '/assets/images/favicon.png',
    badge: '/assets/images/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open PDF Editor',
        icon: '/assets/images/favicon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/images/favicon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PDF Editor', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // This could be used for syncing PDF edits when back online
    console.log('🔄 Background sync triggered');
    // Add your background sync logic here
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache management utilities
async function cleanupCache() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
  
  return Promise.all(
    oldCaches.map(name => {
      console.log('🗑️ Deleting cache:', name);
      return caches.delete(name);
    })
  );
}

// Update cache with new resources
async function updateCache(requests) {
  const cache = await caches.open(CACHE_NAME);
  return Promise.all(
    requests.map(request => {
      return fetch(request).then(response => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      });
    })
  );
} 