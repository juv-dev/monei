import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '~/config/supabase'
import type { User } from '~/shared/types'
import type { Session } from '@supabase/supabase-js'
import { populateDemoData } from '~/modules/demo/services/populateDemo'

const DEMO_USER: User = {
  id: 'demo',
  username: 'demo@monei.app',
  displayName: 'Demo',
  provider: 'demo',
}

const DEMO_SESSION_KEY = 'monei_demo_session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(true)

  function mapSessionToUser(session: Session): User {
    const meta = session.user.user_metadata
    const provider = (session.user.app_metadata.provider ?? 'email') as
      | 'google'
      | 'github'
      | 'email'
    return {
      id: session.user.id,
      username: session.user.email ?? '',
      displayName: meta.full_name ?? meta.name ?? session.user.email ?? '',
      avatarUrl: meta.avatar_url ?? meta.picture,
      provider,
    }
  }

  function setUser(u: User | null): void {
    user.value = u
    isAuthenticated.value = u !== null
  }

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      const demoSession = sessionStorage.getItem(DEMO_SESSION_KEY)
      if (demoSession) {
        setUser(DEMO_USER)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setUser(mapSessionToUser(session))
      }
    } finally {
      isLoading.value = false
    }
  }

  async function signInWithGoogle(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) return { error: error.message }
    return {}
  }

  async function signInWithGitHub(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) return { error: error.message }
    return {}
  }

  async function signUpWithEmail(
    email: string,
    password: string,
  ): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) return { error: error.message }
    return {}
  }

  async function signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
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
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async function logout(): Promise<void> {
    const wasDemo = user.value?.provider === 'demo'
    setUser(null)
    if (wasDemo) {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
    } else {
      await supabase.auth.signOut()
    }
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      setUser(mapSessionToUser(session))
    } else if (user.value?.provider !== 'demo') {
      setUser(null)
    }
    isLoading.value = false
  })

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
    signInWithGitHub,
    signUpWithEmail,
    signInWithEmail,
    signInAsDemo,
    changePassword,
    logout,
  }
})
