import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { clerkPlugin } from '@clerk/vue'

import App from './App.vue'
import router from './router'
import { queryClient } from './plugins/queryClient'
import './style.css'
import { reportAuthNetworkError } from './shared/composables/useNetworkStatus'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not defined in environment variables')
}

const app = createApp(App)

app.config.errorHandler = (_err, _instance, _info) => {}

function isClerkNetworkError(reason: unknown): boolean {
  if (!reason) return false
  const msg = typeof reason === 'string' ? reason : (reason as Error)?.message ?? ''
  const stack = (reason as Error)?.stack ?? ''
  const blob = `${msg} ${stack}`.toLowerCase()
  return blob.includes('clerk') || (blob.includes('failed to fetch') && blob.includes('accounts.dev'))
}

window.addEventListener('unhandledrejection', (event) => {
  if (isClerkNetworkError(event.reason)) {
    reportAuthNetworkError()
  }
})

// Extract the Clerk Frontend API host from the publishable key.
// Format: pk_(test|live)_<base64>  →  base64 decodes to "<host>$"
const CLERK_FAPI_HOST = (() => {
  try {
    const b64 = PUBLISHABLE_KEY.replace(/^pk_(test|live)_/, '')
    return atob(b64).replace(/\$$/, '') // e.g. "pro-phoenix-61.clerk.accounts.dev"
  } catch {
    return ''
  }
})()

// Patch window.fetch to:
//  1. In DEV: rewrite Clerk FAPI calls to /api/__clerk/* so they go through the
//     Vite proxy (vite.config.ts) instead of reaching clerk.accounts.dev directly.
//     This bypasses ad-blockers and network filters transparently — the browser
//     only ever sees localhost, never clerk.accounts.dev.
//     NOTE: only API calls (fetch) are rewritten; script loading (<script> tags)
//     is unaffected, so Clerk's JS bundles load normally.
//  2. In all envs: report auth network errors for UI feedback.
const _originalFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  const req = args[0]
  const url = typeof req === 'string' ? req : (req as Request)?.url ?? ''

  if (import.meta.env.DEV && CLERK_FAPI_HOST && url.startsWith(`https://${CLERK_FAPI_HOST}/`)) {
    const rewritten = url.replace(`https://${CLERK_FAPI_HOST}`, '/api/__clerk')
    args[0] = typeof req === 'string' ? rewritten : new Request(rewritten, req as RequestInit)
  }

  try {
    return await _originalFetch(...args)
  } catch (err) {
    let isClerkHost = false
    try {
      const hostname = new URL(url, window.location.origin).hostname.toLowerCase()
      isClerkHost =
        hostname === 'clerk.com' ||
        hostname.endsWith('.clerk.com') ||
        hostname === 'clerk.accounts.dev' ||
        hostname.endsWith('.clerk.accounts.dev')
    } catch {
      isClerkHost = false
    }
    if (isClerkHost) {
      reportAuthNetworkError()
    }
    throw err
  }
}

app.use(clerkPlugin, { publishableKey: PUBLISHABLE_KEY })
app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
