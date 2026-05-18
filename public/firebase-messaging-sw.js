importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAlMYUK_nLnuM2Q3mag9x66TSQersWPkmA',
  authDomain: 'monei-a9987.firebaseapp.com',
  projectId: 'monei-a9987',
  storageBucket: 'monei-a9987.firebasestorage.app',
  messagingSenderId: '1064478299982',
  appId: '1:1064478299982:web:5d156444b299ecf698f01f',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Monei'
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data ?? {},
  }
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    }),
  )
})
