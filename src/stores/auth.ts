import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useClerk, useUser, useSignIn } from '@clerk/vue'
import type { User } from '~/shared/types'
import { populateDemoData } from '~/modules/demo/services/populateDemo'
import { setSupabaseToken } from '~/config/supabase'

// NOTE: Existing Supabase DB records have Supabase UUIDs as user_id.
// New Clerk user IDs are in the format "user_XXXXX" (different format).
// New records created after this migration will use the Clerk user ID.
// Historical records with Supabase UUIDs will need a one-time data migration
// if you need to link them to the new Clerk users.

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
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes for financial apps

export const useAuthStore = defineStore('auth', () => {
  const clerk = useClerk()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signIn } = useSignIn()

  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(true)
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null
  let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null

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

  // Watch Clerk user state and sync to local user ref
  watch(
    [clerkLoaded, clerkUser],
    async ([loaded]) => {
      if (!loaded) return

      const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY)
      if (demoSession) {
        // Demo mode takes priority — don't overwrite with Clerk state
        return
      }

      const mapped = mapClerkUserToAppUser()

      if (mapped) {
        // Fetch the Supabase token BEFORE setting the user so queries don't
        // fire before RLS auth is ready (race condition on page reload)
        const token = await clerk.value?.session?.getToken({ template: 'supabase' })
        setSupabaseToken(token ?? null)
        startTokenRefresh()
      } else {
        setSupabaseToken(null)
        stopTokenRefresh()
      }

      setUser(mapped)
      isLoading.value = false
    },
    { immediate: true },
  )

  async function initialize(): Promise<void> {
    isLoading.value = true

    // Check demo session first
    const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (demoSession) {
      setUser(DEMO_USER)
      isLoading.value = false
      return
    }

    // If Clerk is already loaded, sync immediately
    if (clerkLoaded.value) {
      const mapped = mapClerkUserToAppUser()
      setUser(mapped)
      isLoading.value = false
      return
    }

    // Otherwise wait for Clerk to load (the watcher above will handle it)
    // isLoading will be set to false by the watcher once clerkLoaded becomes true
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

      // Prepare email verification
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

      // Set the active session after successful sign-in
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
    tokenRefreshInterval = setInterval(async () => {
      const token = await clerk.value?.session?.getToken({ template: 'supabase' })
      setSupabaseToken(token ?? null)
    }, 50_000) // refresca cada 50s (el token dura 60s)
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

  // Listen for user activity to reset the timer
  if (typeof window !== 'undefined') {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })
  }

  async function logout(): Promise<void> {
    stopInactivityTimer()
    stopTokenRefresh()
    setSupabaseToken(null)
    const wasDemo = user.value?.provider === 'demo'
    setUser(null)
    if (wasDemo) {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
    } else {
      await clerk.value?.signOut()
    }
    // Clean up query cache on logout
    sessionStorage.clear()
  }

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)
  const userId = computed(() => user.value?.id ?? '')

  return {
    user,
    isAuthenticated,
    isLoading,
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
