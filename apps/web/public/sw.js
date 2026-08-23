// Service worker de KidCare: solo existe para recibir Web Push (protocolo
// estandar del navegador, sin Firebase) y mostrar la notificacion nativa del
// sistema operativo. No cachea nada ni intercepta peticiones normales.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'KidCare', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'KidCare 🧸';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    tag: payload.data && payload.data.announcementId
      ? `announcement-${payload.data.announcementId}`
      : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/dashboard');
    }),
  );
});
