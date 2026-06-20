import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import AppLayout from '~/shared/components/layout/AppLayout.vue'
import { mountWithPlugins } from '../helpers/setup'

describe('should AppLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  function mountLayout() {
    const { wrapper, pinia } = mountWithPlugins(AppLayout)
    const auth = useAuthStore(pinia)
    auth.$patch({
      user: { id: 'jugaz', username: 'jugaz', displayName: 'Jugaz', provider: 'demo' },
      isAuthenticated: true,
    })
    return { wrapper, pinia }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the main layout container', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(true)
  })

  it('should render the main content area', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true)
  })

  it('should render the bottom navigation bar', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    expect(wrapper.find('[data-testid="bottom-nav"]').exists()).toBe(true)
  })

  it('should render exactly 6 bottom navigation links', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    const links = wrapper.findAll('[data-testid="nav-link"]')
    expect(links).toHaveLength(6)
  })

  it('should render navigation links', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    const links = wrapper.findAll('[data-testid="nav-link"]')
    expect(links.length).toBeGreaterThan(0)
  })

  // ─── Sin sidebar desktop ─────────────────────────────────────────────────
  it('should not render a desktop sidebar', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(false)
  })

  it('should not render a toggle sidebar button', async () => {
    const { wrapper } = mountLayout()
    await flushPromises()
    expect(wrapper.find('[data-testid="toggle-sidebar"]').exists()).toBe(false)
  })

  // ─── Logout via store ────────────────────────────────────────────────────
  it('should support logout through auth store', async () => {
    const { pinia } = mountLayout()
    const auth = useAuthStore(pinia)
    expect(auth.isAuthenticated).toBe(true)
    await auth.logout()
    await flushPromises()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })
})
