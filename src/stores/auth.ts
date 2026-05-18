import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useClerk, useUser, useSignIn } from '@clerk/vue'
import type { User } from '~/shared/types'
import { populateDemoData } from '~/modules/demo/services/populateDemo'
import { setNeonToken } from '~/config/neon'

function resolveAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch')) {
    return 'No se pudo conectar con el servicio de autenticación. Verificá tu conexión e intentá de nuevo.'
  }
  return err instanceof Error ? err.message : 'Error al iniciar sesión'
}

const DEMO_USER: User = {
  id: 'demo',
  username: 'demo@monei.app',
  displayName: 'Demo',
  provider: 'demo',
}

const DEMO_SESSION_KEY = 'monei_demo_session'
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const clerk = useClerk()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signIn } = useSignIn()

  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(true)
  const isTokenReady = ref(false)
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null
  let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null

  async function fetchAndSetToken(): Promise<boolean> {
    try {
      const token = await clerk.value?.session?.getToken({ template: 'neon' })
      setNeonToken(token ?? null)
      isTokenReady.value = !!token
      return !!token
    } catch {
      setNeonToken(null)
      isTokenReady.value = false
      return false
    }
  }

  function mapClerkUserToAppUser(): User | null {
    const cu = clerkUser.value
    if (!cu) return null

    const externalProvider = cu.externalAccounts?.[0]?.provider
    let provider: 'google' | 'github' | 'email' = 'email'
    if (externalProvider === 'google') {
      provider = 'google'
    } else if (externalProvider === 'github') {
      provider = 'github'
    }

    return {
      id: cu.id,
      username: cu.primaryEmailAddress?.emailAddress ?? cu.id,
      displayName: [cu.firstName?.split(' ')[0], cu.lastName?.split(' ')[0]].filter(Boolean).join(' ') || cu.primaryEmailAddress?.emailAddress || cu.id,
      avatarUrl: cu.imageUrl ?? undefined,
      provider,
    }
  }

  function setUser(u: User | null): void {
    user.value = u
    isAuthenticated.value = u !== null
    if (u && u.provider !== 'demo') {
      startInactivityTimer()
    } else {
      stopInactivityTimer()
    }
  }

  watch(
    [clerkLoaded, clerkUser],
    async ([loaded]) => {
      if (!loaded) return

      const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY)
      if (demoSession) {
        return
      }

      const mapped = mapClerkUserToAppUser()

      if (mapped) {
        await fetchAndSetToken()
        startTokenRefresh()
      } else {
        setNeonToken(null)
        isTokenReady.value = false
        stopTokenRefresh()
      }

      setUser(mapped)
      isLoading.value = false
    },
    { immediate: true },
  )

  async function initialize(): Promise<void> {
    isLoading.value = true

    const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (demoSession) {
      isTokenReady.value = true
      setUser(DEMO_USER)
      isLoading.value = false
      return
    }

    if (clerkLoaded.value) {
      const mapped = mapClerkUserToAppUser()
      if (mapped) {
        await fetchAndSetToken()
        startTokenRefresh()
      } else {
        setNeonToken(null)
        isTokenReady.value = false
      }
      setUser(mapped)
      isLoading.value = false
      return
    }
  }

  async function signInWithGoogle(): Promise<{ error?: string }> {
    try {
      await signIn.value?.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/',
      })
      return {}
    } catch (err) {
      return { error: resolveAuthError(err) }
    }
  }

  async function signInWithApple(): Promise<{ error?: string }> {
    try {
      await signIn.value?.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/',
      })
      return {}
    } catch (err) {
      return { error: resolveAuthError(err) }
    }
  }

  async function signUpWithEmail(email: string, password: string): Promise<{ error?: string }> {
    try {
      const result = await clerk.value?.client?.signUp.create({
        emailAddress: email,
        password,
      })
      if (!result) return { error: 'Clerk no está disponible' }

      await clerk.value?.client?.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      return {}
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> }
      if (clerkError?.errors?.length) {
        const e = clerkError.errors[0]
        return { error: e?.longMessage ?? e?.message ?? 'Error al registrarse' }
      }
      return { error: resolveAuthError(err) }
    }
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
    try {
      const result = await clerk.value?.client?.signIn.create({
        identifier: email,
        password,
      })
      if (!result) return { error: 'Clerk no está disponible' }

      if (result.status === 'complete') {
        await clerk.value?.setActive({ session: result.createdSessionId })
      }

      return {}
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> }
      if (clerkError?.errors?.length) {
        const e = clerkError.errors[0]
        return { error: e?.longMessage ?? e?.message ?? 'Error al iniciar sesión' }
      }
      return { error: resolveAuthError(err) }
    }
  }

  async function signInAsDemo(): Promise<void> {
    sessionStorage.setItem(DEMO_SESSION_KEY, '1')
    isTokenReady.value = true
    setUser(DEMO_USER)
    await populateDemoData()
  }

  async function changePassword(
    _currentPass: string,
    newPass: string,
    confirmPass: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (newPass !== confirmPass) {
      return { success: false, error: 'Las contraseñas no coinciden' }
    }
    if (newPass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
    }
    try {
      await clerkUser.value?.updatePassword({ newPassword: newPass })
      return { success: true }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ longMessage?: string; message?: string }> }
      if (clerkError?.errors?.length) {
        const e = clerkError.errors[0]
        return { success: false, error: e?.longMessage ?? e?.message ?? 'Error al cambiar contraseña' }
      }
      return { success: false, error: err instanceof Error ? err.message : 'Error al cambiar contraseña' }
    }
  }

  function startTokenRefresh(): void {
    stopTokenRefresh()
    tokenRefreshInterval = setInterval(() => {
      void fetchAndSetToken()
    }, 50_000)
  }

  function stopTokenRefresh(): void {
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval)
      tokenRefreshInterval = null
    }
  }

  function startInactivityTimer(): void {
    stopInactivityTimer()
    if (!isAuthenticated.value || user.value?.provider === 'demo') return
    inactivityTimer = setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT_MS)
  }

  function stopInactivityTimer(): void {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }

  function resetInactivityTimer(): void {
    if (isAuthenticated.value && user.value?.provider !== 'demo') {
      startInactivityTimer()
    }
  }

  if (typeof window !== 'undefined') {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })
  }

  async function logout(): Promise<void> {
    stopInactivityTimer()
    stopTokenRefresh()
    setNeonToken(null)
    isTokenReady.value = false
    const wasDemo = user.value?.provider === 'demo'
    setUser(null)
    if (wasDemo) {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
    } else {
      await clerk.value?.signOut()
    }
    sessionStorage.clear()
  }

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)
  const userId = computed(() => user.value?.id ?? '')

  return {
    user,
    isAuthenticated,
    isLoading,
    isTokenReady,
    currentUser,
    isLoggedIn,
    userId,
    initialize,
    signInWithGoogle,
    signInWithApple,
    signUpWithEmail,
    signInWithEmail,
    signInAsDemo,
    changePassword,
    logout,
  }
})
