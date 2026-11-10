// Service worker di Aurora: rende l'app installabile e mostra le notifiche dei nuovi ordini.
// NON salva nulla in cache: il sito si carica sempre dalla rete, quindi
// ogni aggiornamento pubblicato su GitHub/Vercel è subito visibile.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* passa-through: gestisce il browser */ });

// Notifica in arrivo dal server (nuovo ordine)
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Aurora', {
      body: d.body || 'Nuovo ordine ricevuto',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || undefined,
      data: { url: d.url || '/home' },
    })
  );
});

// Tocco sulla notifica: apre (o porta davanti) l'app Aurora
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/home';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
