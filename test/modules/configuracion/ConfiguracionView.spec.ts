import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import ConfiguracionView from '~/modules/configuracion/views/ConfiguracionView.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should ConfiguracionView', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  function mountWithAuthUser(overrides: Partial<{ id: string; username: string; displayName: string; provider: string; avatarUrl?: string }> = {}) {
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

  // ─── Renderizado ─────────────────────────────────────────────────────────
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

  // ─── Avatar ────────────────────────────────────────────────────────────────
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

  // ─── Logout ────────────────────────────────────────────────────────────────
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

  // ─── No password form ──────────────────────────────────────────────────────
  it('should NOT render password change form', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="change-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="current-pass-input"]').exists()).toBe(false)
  })
})
