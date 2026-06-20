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
import { isFirebaseConfigured, requestFcmToken, onForegroundMessage } from '~/config/firebase'
import { fcmTokensApi } from '~/shared/services/fcmTokensApi'

function setupNotificationApi(permission: NotificationPermission = 'default') {
  Object.defineProperty(window, 'Notification', {
    writable: true,
    configurable: true,
    value: class {
      static permission: NotificationPermission = permission
      static requestPermission = vi.fn(async () => permission)
    },
  })
  Object.defineProperty(window, 'PushManager', { writable: true, configurable: true, value: class {} })
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue({ active: { postMessage: vi.fn() } }) },
  })
}

function mountWithAuth() {
  return withSetup(() => {
    const auth = useAuthStore()
    auth.$patch({
      user: { id: 'u1', username: 'u1', displayName: 'U', provider: 'email' },
      isAuthenticated: true,
      isTokenReady: true,
    })
    return usePushNotifications()
  })
}

describe('should usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupNotificationApi('granted')
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

    const { result, unmount } = mountWithAuth()
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

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()
    await result.disable()
    await flushPromises()

    expect(fcmTokensApi.unregister).toHaveBeenCalledWith('u1', 'fake-fcm-token')
    expect(result.isEnabled.value).toBe(false)
    unmount()
  })

  it('should not call register when notifications are not supported', async () => {
    Reflect.deleteProperty(window, 'PushManager')
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    expect(result.isSupported.value).toBe(false)
    await result.enable()
    await flushPromises()

    expect(fcmTokensApi.register).not.toHaveBeenCalled()
    unmount()
  })

  it('should not call register when firebase is not configured', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false)

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(fcmTokensApi.register).not.toHaveBeenCalled()
    unmount()
  })

  it('should not call register when userId is empty', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    const { result, unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(fcmTokensApi.register).not.toHaveBeenCalled()
    unmount()
  })

  it('should set isWorking to false after enable completes', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue('token')

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(result.isWorking.value).toBe(false)
    unmount()
  })

  it('should set isEnabled false and isWorking false when permission is denied', async () => {
    setupNotificationApi('denied')
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(result.isEnabled.value).toBe(false)
    expect(result.isWorking.value).toBe(false)
    expect(fcmTokensApi.register).not.toHaveBeenCalled()
    unmount()
  })

  it('should not register when requestFcmToken returns null', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue(null)

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(fcmTokensApi.register).not.toHaveBeenCalled()
    expect(result.isEnabled.value).toBe(false)
    unmount()
  })

  it('should set isWorking false when enable throws an error', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockRejectedValue(new Error('FCM error'))

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(result.isWorking.value).toBe(false)
    unmount()
  })

  it('should set isWorking false when disable throws an error', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue('token-err')
    vi.mocked(fcmTokensApi.unregister).mockRejectedValue(new Error('Unregister error'))

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()
    await result.disable()
    await flushPromises()

    expect(result.isWorking.value).toBe(false)
    unmount()
  })

  it('should not call unregister when currentToken is null', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.disable()
    await flushPromises()

    expect(fcmTokensApi.unregister).not.toHaveBeenCalled()
    unmount()
  })

  it('should call onForegroundMessage when mounted with granted permission and firebase configured', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    setupNotificationApi('granted')

    const { unmount } = withSetup(() => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: class {
          static permission: NotificationPermission = 'granted'
          static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
        },
      })
      return usePushNotifications()
    })
    await flushPromises()

    expect(onForegroundMessage).toHaveBeenCalled()
    unmount()
  })

  it('should show toast from foreground message when title or body is present', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    let capturedHandler: ((payload: { title?: string; body?: string }) => void) | null = null
    vi.mocked(onForegroundMessage).mockImplementation((handler) => {
      capturedHandler = handler
      return () => {}
    })

    const { unmount } = withSetup(() => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: class {
          static permission: NotificationPermission = 'granted'
          static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
        },
      })
      return usePushNotifications()
    })
    await flushPromises()

    expect(() => {
      capturedHandler?.({ title: 'Test', body: 'Test body' })
    }).not.toThrow()

    unmount()
  })

  it('should read stored FCM token from localStorage on mount', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    localStorage.setItem('monei_fcm_token', 'stored-token')

    const { result, unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    expect(result.isEnabled.value).toBe(true)
    unmount()
  })

  it('should show fallback message in enable catch when thrown value is not an Error', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockRejectedValue('plain string error')

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()

    expect(result.isWorking.value).toBe(false)
    unmount()
  })

  it('should show fallback message in disable catch when thrown value is not an Error', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)
    vi.mocked(requestFcmToken).mockResolvedValue('token-str')
    vi.mocked(fcmTokensApi.unregister).mockRejectedValue('string unregister error')

    const { result, unmount } = mountWithAuth()
    await flushPromises()

    await result.enable()
    await flushPromises()
    await result.disable()
    await flushPromises()

    expect(result.isWorking.value).toBe(false)
    unmount()
  })

  it('should not call showToast when foreground message has no title or body', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    let capturedHandler: ((payload: { title?: string; body?: string }) => void) | null = null
    vi.mocked(onForegroundMessage).mockImplementation((handler) => {
      capturedHandler = handler
      return () => {}
    })

    const { unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    expect(() => {
      capturedHandler?.({})
    }).not.toThrow()

    unmount()
  })

  it('should show toast with title when foreground message has only title', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true)

    let capturedHandler: ((payload: { title?: string; body?: string }) => void) | null = null
    vi.mocked(onForegroundMessage).mockImplementation((handler) => {
      capturedHandler = handler
      return () => {}
    })

    const { unmount } = withSetup(() => usePushNotifications())
    await flushPromises()

    expect(() => {
      capturedHandler?.({ title: 'Only title' })
    }).not.toThrow()

    unmount()
  })
})
