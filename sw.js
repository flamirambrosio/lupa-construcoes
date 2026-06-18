// LUPA Facilities — Service Worker
const CACHE = 'lupa-v1';
const APP_SHELL = ['/lupa-construcoes/', '/lupa-construcoes/index.html'];

// Instala e faz cache do app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network first para APIs do Google, Cache first para app
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // APIs do Google — sempre network, nunca cache
  if (url.includes('googleapis.com') || url.includes('accounts.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell — network first, fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
