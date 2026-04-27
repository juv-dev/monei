import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

describe('should useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
  })

  // ─── Estado inicial ──────────────────────────────────────────────────────
  it('should have null user and not authenticated initially', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.currentUser).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.userId).toBe('')
  })

  // ─── Demo session restore ─────────────────────────────────────────────────
  it('should restore demo session from sessionStorage', async () => {
    sessionStorage.setItem('monei_demo_session', '1')

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('demo')
    expect(auth.user?.provider).toBe('demo')
    expect(auth.user?.displayName).toBe('Demo')
    expect(auth.isLoading).toBe(false)
  })

  // ─── Demo sign in ─────────────────────────────────────────────────────────
  it('should sign in as demo user', () => {
    const auth = useAuthStore()
    auth.signInAsDemo()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('demo')
    expect(auth.user?.username).toBe('demo@monei.app')
    expect(auth.user?.displayName).toBe('Demo')
    expect(auth.user?.provider).toBe('demo')
    expect(sessionStorage.getItem('monei_demo_session')).toBe('1')
  })

  // ─── Logout demo ────────────────────────────────────────────────────────────
  it('should logout demo user and clear sessionStorage', async () => {
    const auth = useAuthStore()
    auth.signInAsDemo()
    await auth.logout()

    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('monei_demo_session')).toBeNull()
  })

  // ─── Logout OAuth ──────────────────────────────────────────────────────────
  it('should clear user state on logout', async () => {
    const auth = useAuthStore()
    auth.$patch({
      user: { id: 'clerk-user-123', username: 'test@gmail.com', displayName: 'Test', provider: 'google' },
      isAuthenticated: true,
    })

    await auth.logout()

    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  // ─── Computed helpers ──────────────────────────────────────────────────────
  it('should return userId from user id', () => {
    const auth = useAuthStore()
    auth.signInAsDemo()
    expect(auth.userId).toBe('demo')
  })

  it('should return empty userId when not authenticated', () => {
    const auth = useAuthStore()
    expect(auth.userId).toBe('')
  })

  it('should expose currentUser and isLoggedIn as computed', () => {
    const auth = useAuthStore()
    expect(auth.currentUser).toBeNull()
    expect(auth.isLoggedIn).toBe(false)

    auth.signInAsDemo()
    expect(auth.currentUser).not.toBeNull()
    expect(auth.isLoggedIn).toBe(true)
  })

  // ─── Change password validation ────────────────────────────────────────────
  it('should fail when passwords do not match', async () => {
    const auth = useAuthStore()
    const result = await auth.changePassword('old', 'newPass123', 'different')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Las contraseñas no coinciden')
  })

  it('should fail when new password is too short', async () => {
    const auth = useAuthStore()
    const result = await auth.changePassword('old', '12345', '12345')

    expect(result.success).toBe(false)
    expect(result.error).toBe('La contraseña debe tener al menos 6 caracteres')
  })
})
