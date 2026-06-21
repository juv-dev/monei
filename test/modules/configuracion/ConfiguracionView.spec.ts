import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('~/shared/composables/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}))

vi.mock('~/shared/composables/useExchangeRate', () => ({
  useExchangeRate: vi.fn(),
}))

import { useAuthStore } from '~/stores/auth'
import { usePushNotifications } from '~/shared/composables/usePushNotifications'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import ConfiguracionView from '~/modules/configuracion/views/ConfiguracionView.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should ConfiguracionView', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(false),
      isEnabled: ref(false),
      isConfigured: ref(false),
      isWorking: ref(false),
      permission: ref('default' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    vi.mocked(useExchangeRate).mockReturnValue({
      rate: ref(3.75),
      isFallback: ref(true),
      updatedAt: ref(''),
      updatedAtDisplay: computed(() => ''),
      isLoading: ref(false),
      usdToPen: vi.fn((v: number) => v * 3.75),
      penToUsd: vi.fn((v: number) => v / 3.75),
      refresh: vi.fn().mockResolvedValue(undefined),
    } as any)
  })

  function mountWithAuthUser(
    overrides: Partial<{
      id: string
      username: string
      displayName: string
      provider: string
      avatarUrl?: string
    }> = {},
  ) {
    const { wrapper, pinia, router } = mountWithPlugins(ConfiguracionView)
    const auth = useAuthStore(pinia)
    auth.$patch({
      user: {
        id: overrides.id ?? 'demo',
        username: overrides.username ?? 'jesusugazv@gmail.com',
        displayName: overrides.displayName ?? 'Jugaz',
        provider: overrides.provider ?? 'demo',
        avatarUrl: overrides.avatarUrl,
      },
      isAuthenticated: true,
    })
    return { wrapper, auth, router }
  }

  it('should render the configuracion view', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="configuracion-view"]').exists()).toBe(true)
  })

  it('should show current user display name', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="user-display-name"]').text()).toBe('Jugaz')
  })

  it('should show current user email', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="user-email"]').text()).toBe('jesusugazv@gmail.com')
  })

  it('should show user info in account section', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="info-name"]').text()).toBe('Jugaz')
    expect(wrapper.find('[data-testid="info-email"]').text()).toBe('jesusugazv@gmail.com')
  })

  it('should show provider label', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'google' })
    await flushPromises()

    expect(wrapper.find('[data-testid="info-provider"]').text()).toBe('Google')
  })

  it('should show Demo provider label for demo user', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'demo' })
    await flushPromises()

    expect(wrapper.find('[data-testid="info-provider"]').text()).toBe('Demo')
  })

  it('should show GitHub provider label for github user', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'github' })
    await flushPromises()

    expect(wrapper.find('[data-testid="info-provider"]').text()).toBe('GitHub')
  })

  it('should show user initial when no avatar', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="user-initial"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="user-initial"]').text()).toBe('J')
    expect(wrapper.find('[data-testid="user-avatar"]').exists()).toBe(false)
  })

  it('should show avatar when avatarUrl is available', async () => {
    const { wrapper } = mountWithAuthUser({ avatarUrl: 'https://example.com/pic.jpg' })
    await flushPromises()

    expect(wrapper.find('[data-testid="user-avatar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="user-initial"]').exists()).toBe(false)
  })

  it('should render logout button', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="logout-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="logout-button"]').text()).toContain('Cerrar sesión')
  })

  it('should call logout and redirect on logout button click', async () => {
    const { wrapper, auth, router } = mountWithAuthUser()
    await flushPromises()

    const logoutSpy = vi.spyOn(auth, 'logout').mockResolvedValue()
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('[data-testid="logout-button"]').trigger('click')
    await flushPromises()

    expect(logoutSpy).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })

  it('should NOT render password change form', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="change-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="current-pass-input"]').exists()).toBe(false)
  })

  it('should show session badge with Google label for google provider', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'google' })
    await flushPromises()
    expect(wrapper.text()).toContain('Sesión activa · Google')
  })

  it('should show session badge with Email label for email provider', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'email' })
    await flushPromises()
    expect(wrapper.text()).toContain('Sesión activa · Email')
  })

  it('should show session badge without provider label for unknown provider', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'unknown_xyz' })
    await flushPromises()
    expect(wrapper.text()).toContain('Sesión activa')
    expect(wrapper.text()).not.toContain('Sesión activa ·')
  })

  it('should show Gestionar cuenta button when user is not demo', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'google' })
    await flushPromises()
    expect(wrapper.text()).toContain('Gestionar cuenta')
  })

  it('should hide Gestionar cuenta button when user is demo', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'demo' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Gestionar cuenta')
  })

  it('should not throw when Gestionar cuenta button is clicked with null clerk', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'google' })
    await flushPromises()
    const manageBtn = wrapper.findAll('button').find(b => b.text().includes('Gestionar cuenta'))
    await expect(manageBtn!.trigger('click')).resolves.not.toThrow()
  })

  it('should show push-not-supported message when push is not supported', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="push-not-supported"]').exists()).toBe(true)
  })

  it('should show push-not-configured message when push is supported but not configured', async () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(false),
      isConfigured: ref(false),
      isWorking: ref(false),
      permission: ref('default' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="push-not-configured"]').exists()).toBe(true)
  })

  it('should show push toggle button with aria-pressed false when push is configured but not enabled', async () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(false),
      isConfigured: ref(true),
      isWorking: ref(false),
      permission: ref('default' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    const toggle = wrapper.find('[data-testid="push-toggle-button"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('aria-pressed')).toBe('false')
  })

  it('should show push toggle button with aria-pressed true when push is enabled', async () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(true),
      isConfigured: ref(true),
      isWorking: ref(false),
      permission: ref('granted' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="push-toggle-button"]').attributes('aria-pressed')).toBe('true')
  })

  it('should call enable when push toggle is clicked and notifications are not enabled', async () => {
    const enableFn = vi.fn().mockResolvedValue(undefined)
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(false),
      isConfigured: ref(true),
      isWorking: ref(false),
      permission: ref('default' as NotificationPermission),
      enable: enableFn,
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    await wrapper.find('[data-testid="push-toggle-button"]').trigger('click')
    await flushPromises()
    expect(enableFn).toHaveBeenCalled()
  })

  it('should call disable when push toggle is clicked and notifications are enabled', async () => {
    const disableFn = vi.fn().mockResolvedValue(undefined)
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(true),
      isConfigured: ref(true),
      isWorking: ref(false),
      permission: ref('granted' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: disableFn,
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    await wrapper.find('[data-testid="push-toggle-button"]').trigger('click')
    await flushPromises()
    expect(disableFn).toHaveBeenCalled()
  })

  it('should disable push toggle button when notification permission is denied', async () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: ref(true),
      isEnabled: ref(false),
      isConfigured: ref(true),
      isWorking: ref(false),
      permission: ref('denied' as NotificationPermission),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    } as any)
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="push-toggle-button"]').attributes('disabled')).toBeDefined()
  })

  it('should show plan alimenticio button after hasPet toggle is activated', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    await wrapper.find('[aria-label="Activar plan mascota"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[aria-label="Abrir plan alimenticio"]').exists()).toBe(true)
  })

  it('should navigate to mascota when plan alimenticio button is clicked', async () => {
    const { wrapper, router } = mountWithAuthUser()
    await flushPromises()
    await wrapper.find('[aria-label="Activar plan mascota"]').trigger('click')
    await nextTick()
    await wrapper.find('[aria-label="Abrir plan alimenticio"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('mascota')
  })

  it('should show the exchange rate value formatted to 3 decimals', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.text()).toContain('3.750')
  })

  it('should show Estimado badge when exchange rate is using fallback value', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.text()).toContain('Estimado')
  })

  it('should show Desconocido label for unknown provider', async () => {
    const { wrapper } = mountWithAuthUser({ provider: 'xyz' })
    await flushPromises()
    expect(wrapper.find('[data-testid="info-provider"]').text()).toBe('Desconocido')
  })
})
