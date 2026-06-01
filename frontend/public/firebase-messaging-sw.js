self.addEventListener('push', (event) => {
  try {
    const payload = event.data ? event.data.json() : {};
    const notification = payload.notification || {};
    const title = notification.title || 'PawCare';
    const options = {
      body: notification.body || 'You have a new PawCare notification.',
      data: payload.data || {}
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    event.waitUntil(
      self.registration.showNotification('PawCare', {
        body: 'You have a new PawCare notification.'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
