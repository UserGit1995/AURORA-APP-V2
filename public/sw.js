// Service worker minimo di Aurora: serve solo a rendere l'app installabile.
// NON salva nulla in cache: il sito si carica sempre dalla rete, quindi
// ogni aggiornamento pubblicato su GitHub/Vercel è subito visibile.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* passa-through: gestisce il browser */ });
