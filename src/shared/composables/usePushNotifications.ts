import { ref, computed, readonly, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { isFirebaseConfigured, requestFcmToken, onForegroundMessage } from '~/config/firebase'
import { fcmTokensApi } from '~/shared/services/fcmTokensApi'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'

const STORED_TOKEN_KEY = 'monei_fcm_token'

export function usePushNotifications() {
  const auth = useAuthStore()
  const { showToast } = useAppFeedback()

  const isSupported = ref(false)
  const permission = ref<NotificationPermission>('default')
  const currentToken = ref<string | null>(null)
  const isWorking = ref(false)

  const isConfigured = computed(() => isFirebaseConfigured())
  const isEnabled = computed(() => permission.value === 'granted' && currentToken.value !== null)

  function readState(): void {
    if (typeof window === 'undefined') return
    isSupported.value = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    if (isSupported.value) {
      permission.value = Notification.permission
      currentToken.value = localStorage.getItem(STORED_TOKEN_KEY)
    }
  }

  async function enable(): Promise<void> {
    if (!isSupported.value || !isConfigured.value || !auth.userId) return
    isWorking.value = true
    try {
      const result = await Notification.requestPermission()
      permission.value = result
      if (result !== 'granted') {
        showToast('Permiso de notificaciones denegado', 'error')
        return
      }
      const token = await requestFcmToken()
      if (!token) {
        showToast('No se pudo obtener el token de notificaciones', 'error')
        return
      }
      await fcmTokensApi.register(auth.userId, token)
      currentToken.value = token
      localStorage.setItem(STORED_TOKEN_KEY, token)
      showToast('Notificaciones activadas')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al activar notificaciones', 'error')
    } finally {
      isWorking.value = false
    }
  }

  async function disable(): Promise<void> {
    if (!currentToken.value || !auth.userId) return
    isWorking.value = true
    try {
      await fcmTokensApi.unregister(auth.userId, currentToken.value)
      localStorage.removeItem(STORED_TOKEN_KEY)
      currentToken.value = null
      showToast('Notificaciones desactivadas')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al desactivar', 'error')
    } finally {
      isWorking.value = false
    }
  }

  onMounted(() => {
    readState()
    if (isConfigured.value && permission.value === 'granted') {
      onForegroundMessage((payload) => {
        if (payload.title || payload.body) {
          showToast(payload.body ?? payload.title ?? '')
        }
      })
    }
  })

  return {
    isSupported: readonly(isSupported),
    isConfigured,
    isEnabled,
    permission: readonly(permission),
    isWorking: readonly(isWorking),
    enable,
    disable,
  }
}
