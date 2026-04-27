import { ref, onMounted, onUnmounted } from 'vue'

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const hasAuthError = ref(false)
const reconnectedFlash = ref(false)

let listenersAttached = false

function handleOnline() {
  if (!isOnline.value) {
    reconnectedFlash.value = true
    setTimeout(() => (reconnectedFlash.value = false), 2500)
  }
  isOnline.value = true
  hasAuthError.value = false
}

function handleOffline() {
  isOnline.value = false
}

function attachListeners() {
  if (listenersAttached || typeof window === 'undefined') return
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  listenersAttached = true
}

export function reportAuthNetworkError() {
  hasAuthError.value = true
}

export function clearAuthNetworkError() {
  hasAuthError.value = false
}

export function useNetworkStatus() {
  onMounted(attachListeners)
  onUnmounted(() => {
    // keep global listeners alive across route changes; do nothing
  })

  return { isOnline, hasAuthError, reconnectedFlash }
}
