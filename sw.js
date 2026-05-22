// LumaPsi Service Worker
// Versão: atualizar esse número a cada novo deploy para forçar atualização
var CACHE_NAME = 'lumapsi-v1';

// Arquivos para cache offline (shell do app)
var CACHE_FILES = [
  '/',
  '/manifest.json'
];

// Instalar: faz cache dos arquivos essenciais
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// Ativar: limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first, cache como fallback
// Para o Supabase e APIs externas: sempre network
// Para o app shell: cache como fallback quando offline
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Sempre buscar da rede para APIs e recursos externos
  if (
    url.includes('supabase.co') ||
    url.includes('googleapis.com') ||
    url.includes('z-api.io') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para o app: Network first, fallback para cache
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Salvar no cache se for bem-sucedido
        if (response.ok && event.request.method === 'GET') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline: tentar servir do cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Se não tiver cache, retornar página offline básica
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});
