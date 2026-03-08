import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import LoginView from '~/modules/auth/views/LoginView.vue'
import { useAuthStore } from '~/stores/auth'
import { createTestQueryClient } from '../../helpers/setup'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div/>' } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div/>' } },
    ],
  })
}

describe('should LoginView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
    sessionStorage.clear()
  })

  function mountView(initialRoute = '/login') {
    const router = createTestRouter()
    const queryClient = createTestQueryClient()
    void router.push(initialRoute)
    const wrapper = mount(LoginView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }], router],
      },
    })
    return { wrapper, router }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render login page with OAuth buttons and demo button', () => {
    const { wrapper } = mountView()

    expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="google-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="github-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="demo-button"]').exists()).toBe(true)
  })

  it('should render credentials hint section', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="credentials-hint"]').exists()).toBe(true)
  })

  it('should not show error message initially', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(false)
  })

  it('should show Google button with correct text', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="google-button"]').text()).toContain('Continuar con Google')
  })

  it('should show GitHub button with correct text', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="github-button"]').text()).toContain('Continuar con GitHub')
  })

  it('should show demo button with correct text', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="demo-button"]').text()).toContain('Probar en modo demo')
  })

  // ─── Demo login ────────────────────────────────────────────────────────────
  it('should sign in as demo and redirect to dashboard on demo button click', async () => {
    const { wrapper } = mountView()

    await wrapper.find('[data-testid="demo-button"]').trigger('click')
    await flushPromises()

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.provider).toBe('demo')
  })

  // ─── Google OAuth ──────────────────────────────────────────────────────────
  it('should call signInWithGoogle on Google button click', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'signInWithGoogle').mockResolvedValue({})

    await wrapper.find('[data-testid="google-button"]').trigger('click')
    await flushPromises()

    expect(spy).toHaveBeenCalled()
  })

  it('should show error when Google sign in fails', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    vi.spyOn(auth, 'signInWithGoogle').mockResolvedValue({ error: 'Google OAuth failed' })

    await wrapper.find('[data-testid="google-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Google OAuth failed')
  })

  // ─── Microsoft OAuth ───────────────────────────────────────────────────────
  it('should call signInWithGitHub on GitHub button click', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'signInWithGitHub').mockResolvedValue({})

    await wrapper.find('[data-testid="github-button"]').trigger('click')
    await flushPromises()

    expect(spy).toHaveBeenCalled()
  })

  it('should show error when GitHub sign in fails', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    vi.spyOn(auth, 'signInWithGitHub').mockResolvedValue({ error: 'GitHub error' })

    await wrapper.find('[data-testid="github-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('GitHub error')
  })

  // ─── Email flow ──────────────────────────────────────────────────────────
  it('should show email button initially, not the form', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('[data-testid="email-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(false)
  })

  it('should show email form after clicking email button', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="password-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="email-submit-button"]').exists()).toBe(true)
  })

  it('should not show confirm password in login mode', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="confirm-password-input"]').exists()).toBe(false)
  })

  it('should toggle to register mode and show confirm password', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="confirm-password-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="email-submit-button"]').text()).toContain('Crear cuenta')
  })

  it('should show error when submitting empty email form', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Completa todos los campos')
  })

  it('should show error when register passwords do not match', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('test@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    await wrapper.find('[data-testid="confirm-password-input"]').setValue('different')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Las contraseñas no coinciden')
  })

  it('should show error when register password is too short', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('test@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('12345')
    await wrapper.find('[data-testid="confirm-password-input"]').setValue('12345')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('al menos 6 caracteres')
  })

  it('should call signUpWithEmail on valid registration', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'signUpWithEmail').mockResolvedValue({})

    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('new@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(spy).toHaveBeenCalledWith('new@test.com', 'password123')
    expect(wrapper.find('[data-testid="success-message"]').exists()).toBe(true)
  })

  it('should show error when signUpWithEmail fails', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    vi.spyOn(auth, 'signUpWithEmail').mockResolvedValue({ error: 'Email taken' })

    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('dup@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Email taken')
  })

  it('should call signInWithEmail on login form submit', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'signInWithEmail').mockResolvedValue({})

    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('user@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(spy).toHaveBeenCalledWith('user@test.com', 'password123')
  })

  it('should show error when signInWithEmail fails', async () => {
    const { wrapper } = mountView()
    const auth = useAuthStore()
    vi.spyOn(auth, 'signInWithEmail').mockResolvedValue({ error: 'Wrong password' })

    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="email-input"]').setValue('user@test.com')
    await wrapper.find('[data-testid="password-input"]').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Wrong password')
  })

  it('should toggle between login and register modes', async () => {
    const { wrapper } = mountView()
    await wrapper.find('[data-testid="email-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="email-submit-button"]').text()).toContain('Iniciar sesión')

    let toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Crear cuenta nueva'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="email-submit-button"]').text()).toContain('Crear cuenta')

    toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Ya tengo cuenta'))
    await toggleBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="email-submit-button"]').text()).toContain('Iniciar sesión')
  })

  // ─── Logo y branding ──────────────────────────────────────────────────────
  it('should show Monei branding', () => {
    const { wrapper } = mountView()
    expect(wrapper.text()).toContain('Monei')
    expect(wrapper.text()).toContain('Tu dinero, bajo control')
  })
})
