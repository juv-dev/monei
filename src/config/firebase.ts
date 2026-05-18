import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId &&
      vapidKey,
  )
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) app = initializeApp(config)
  return app
}

function getMessagingInstance(): Messaging | null {
  const fbApp = getApp()
  if (!fbApp) return null
  if (!messaging) messaging = getMessaging(fbApp)
  return messaging
}

async function waitForActive(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration
  const sw = registration.installing ?? registration.waiting
  if (!sw) return registration
  await new Promise<void>((resolve) => {
    const handler = () => {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', handler)
        resolve()
      }
    }
    sw.addEventListener('statechange', handler)
  })
  return registration
}

async function ensureMessagingSw(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    return await waitForActive(registration)
  } catch {
    return null
  }
}

export async function requestFcmToken(): Promise<string | null> {
  const m = getMessagingInstance()
  if (!m) return null
  const registration = await ensureMessagingSw()
  if (!registration) return null
  const token = await getToken(m, { vapidKey, serviceWorkerRegistration: registration })
  return token || null
}

export function onForegroundMessage(handler: (payload: { title?: string; body?: string }) => void): () => void {
  const m = getMessagingInstance()
  if (!m) return () => {}
  return onMessage(m, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
    })
  })
}
