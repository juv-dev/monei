import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../helpers/setup'
import { useAuthStore } from '~/stores/auth'

vi.mock('~/config/firebase', () => ({
  isFirebaseConfigured: vi.fn(),
  requestFcmToken: vi.fn(),
  onForegroundMessage: vi.fn(() => () => {}),
}))

vi.mock('~/shared/services/fcmTokensApi', () => ({
  fcmTokensApi: {
    register: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(undefined),
    listForUser: vi.fn().mockResolvedValue([]),
  },
}))

import { usePushNotifications } from '~/shared/composables/usePushNotifications'
import { isFirebaseConfigured, requestFcmToken } from '~/config/firebase'
import { fcmTokensApi } from '~/shared/services/fcmTokensApi'

describe('should usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: class {
        static permission: NotificationPermission = 'default'
        static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
      },
    })
    Object.defineProperty(window, 'PushManager', { writable: true, configurable: true, value: class {} })
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: { getRegistration: vi.fn().mockResolvedValue({ active: { postMessage: vi.fn() } }) },
    })
  })

  it('should detect support when Notification, ServiceWorker and PushManager exist', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    const { result, unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    expect(result.isSupported.value).toBe(true)
    unmount()
  })

  it('should expose isConfigured false when Firebase config is missing', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false)
    const { result, unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    expect(result.isConfigured.value).toBe(false)
    unmount()
  })

  it('should register token in Neon when enable is called and permission granted', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue('fake-fcm-token')

    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: 'u1', username: 'u1', displayName: 'U', provider: 'email' }, isAuthenticated: true, isTokenReady: true })
      return usePushNotifications()
    })
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(fcmTokensApi.register).toHaveBeenCalledWith('u1', 'fake-fcm-token')
    expect(result.isEnabled.value).toBe(true)
    unmount()
  })

  it('should unregister token from Neon when disable is called', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue('fake-fcm-token')

    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: 'u1', username: 'u1', displayName: 'U', provider: 'email' }, isAuthenticated: true, isTokenReady: true })
      return usePushNotifications()
    })
    await flushPromises()

    await result.enable()
    await flushPromises()
    await result.disable()
    await flushPromises()

    expect(fcmTokensApi.unregister).toHaveBeenCalledWith('u1', 'fake-fcm-token')
    expect(result.isEnabled.value).toBe(false)
    unmount()
  })
})
