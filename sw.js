// LUPA Controle Financeiro — Service Worker
// Versão bumped a cada deploy para forçar reinstalação no mobile
const CACHE = 'lupa-v11-20260705';
const APP_SHELL = ['/lupa-construcoes/', '/lupa-construcoes/index.html'];

// Instala e faz cache do app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Limpa TODOS os caches antigos e assume controle imediato
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('SW: deletando cache antigo', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network ALWAYS FIRST com reload completo — cache só como fallback offline
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // APIs do Google — sempre network, nunca cache
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') ||
      url.includes('gsi/client') || url.includes('fonts.googleapis')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // index.html — sempre busca versão fresca, ignora cache HTTP completamente
  if (url.includes('/lupa-construcoes/') && e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request, {cache: 'reload'})
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Demais recursos — network first, fallback cache
  e.respondWith(
    fetch(e.request, {cache: 'no-cache'})
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
