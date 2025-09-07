// GOPR UAV Ops Manager - Service Worker for PWA functionality
// Provides offline support, caching, and background sync capabilities

const CACHE_NAME = 'gopr-uav-ops-v1.0.38';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Core files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
  '/assets/images/splash-icon.png',
  // Note: JS bundle will be cached dynamically when first requested
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
  
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement cache-first strategy with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle Firebase/Firestore requests (network-first for real-time data)
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebase.googleapis.com')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Handle static assets and app shell (cache-first)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Handle app routes (network-first with cache fallback)
  event.respondWith(networkFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    
    // Return cached version if available, otherwise return offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback response for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Network-first strategy for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses for dynamic content
    if (networkResponse.status === 200 && isDynamicContent(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback for HTML requests when offline
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Helper function to identify static assets
function isStaticAsset(pathname) {
  return pathname.includes('/_expo/static/') ||
         pathname.includes('/assets/') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.ico') ||
         pathname.endsWith('.json');
}

// Helper function to identify dynamic content worth caching
function isDynamicContent(url) {
  // Cache API responses that might be useful offline
  return url.includes('/api/') || 
         url.includes('firestore') ||
         url.includes('firebase');
}

// Background sync for offline actions (when supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // This would sync any offline actions when connection is restored
    // Implementation would depend on specific app requirements
    console.log('[SW] Performing background sync...');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling (for future use)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/assets/images/icon.png',
        badge: '/assets/images/favicon.png',
        tag: 'gopr-uav-notification'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[SW] Service worker script loaded');
