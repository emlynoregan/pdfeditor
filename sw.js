const CACHE_NAME = 'pdf-editor-v16';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/pdf-editor.css',
    '/assets/images/favicon.png',
    '/manifest.json'
    // Note: JS files excluded to respect cache-busting parameters
];

console.log('🔄 Service Worker v16 starting...');

self.addEventListener('install', (event) => {
    console.log('⚙️ Service Worker v16 installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching app shell v16');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker v16 activating...');
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

self.addEventListener('fetch', (event) => {
    // Skip caching for JS files with version parameters to respect cache-busting
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('.js') && url.searchParams.has('v')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

console.log('✅ Service Worker v16 loaded');

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