import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { supabase } from '~/config/supabase'

describe('should useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
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

  // ─── Initialize ──────────────────────────────────────────────────────────
  it('should stay unauthenticated when no session exists', async () => {
    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.isLoading).toBe(false)
  })

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

  it('should restore supabase session on initialize', async () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid-123',
        email: 'test@gmail.com',
        user_metadata: { full_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
        app_metadata: { provider: 'google' },
      },
    }
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
      error: null,
    })

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('supabase-uuid-123')
    expect(auth.user?.username).toBe('test@gmail.com')
    expect(auth.user?.displayName).toBe('Test User')
    expect(auth.user?.avatarUrl).toBe('https://example.com/avatar.jpg')
    expect(auth.user?.provider).toBe('google')
    expect(auth.userId).toBe('supabase-uuid-123')
  })

  it('should prioritize demo session over supabase session', async () => {
    sessionStorage.setItem('monei_demo_session', '1')

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.user?.provider).toBe('demo')
    expect(supabase.auth.getSession).not.toHaveBeenCalled()
  })

  // ─── OAuth sign in ────────────────────────────────────────────────────────
  it('should call supabase signInWithOAuth for Google', async () => {
    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/') },
    })
    expect(result.error).toBeUndefined()
  })

  it('should return error when Google sign in fails', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'google', url: null },
      error: { message: 'OAuth error', name: 'AuthError', status: 400 } as any,
    })

    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()

    expect(result.error).toBe('OAuth error')
  })

  it('should call supabase signInWithOAuth for GitHub', async () => {
    const auth = useAuthStore()
    const result = await auth.signInWithGitHub()

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: expect.stringContaining('/') },
    })
    expect(result.error).toBeUndefined()
  })

  it('should return error when GitHub sign in fails', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
      data: { provider: 'github', url: null },
      error: { message: 'GitHub error', name: 'AuthError', status: 400 } as any,
    })

    const auth = useAuthStore()
    const result = await auth.signInWithGitHub()

    expect(result.error).toBe('GitHub error')
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

  // ─── Logout ────────────────────────────────────────────────────────────────
  it('should logout demo user and clear sessionStorage', async () => {
    const auth = useAuthStore()
    auth.signInAsDemo()
    await auth.logout()

    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('monei_demo_session')).toBeNull()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('should logout OAuth user and call supabase signOut', async () => {
    const auth = useAuthStore()
    auth.$patch({
      user: {
        id: 'uuid-123',
        username: 'test@gmail.com',
        displayName: 'Test',
        provider: 'google',
      },
      isAuthenticated: true,
    })

    await auth.logout()

    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  // ─── onAuthStateChange ────────────────────────────────────────────────────
  it('should update user on auth state change with session', () => {
    const auth = useAuthStore()
    const callbacks = (supabase as any)._authCallbacks as Array<(event: string, session: any) => void>

    callbacks.forEach((cb) =>
      cb('SIGNED_IN', {
        user: {
          id: 'new-uuid',
          email: 'new@gmail.com',
          user_metadata: { full_name: 'New User' },
          app_metadata: { provider: 'google' },
        },
      }),
    )

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('new-uuid')
    expect(auth.user?.displayName).toBe('New User')
  })

  it('should clear user on auth state change with null session', () => {
    const auth = useAuthStore()
    auth.$patch({
      user: {
        id: 'uuid-123',
        username: 'test@gmail.com',
        displayName: 'Test',
        provider: 'google',
      },
      isAuthenticated: true,
    })

    const callbacks = (supabase as any)._authCallbacks as Array<(event: string, session: any) => void>
    callbacks.forEach((cb) => cb('SIGNED_OUT', null))

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('should NOT clear demo user on auth state change with null session', () => {
    const auth = useAuthStore()
    auth.signInAsDemo()

    const callbacks = (supabase as any)._authCallbacks as Array<(event: string, session: any) => void>
    callbacks.forEach((cb) => cb('SIGNED_OUT', null))

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.provider).toBe('demo')
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

  // ─── mapSessionToUser edge cases ──────────────────────────────────────────
  it('should use email as displayName when no full_name or name in metadata', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'uuid-456',
            email: 'noname@gmail.com',
            user_metadata: {},
            app_metadata: { provider: 'github' },
          },
        } as any,
      },
      error: null,
    })

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.user?.displayName).toBe('noname@gmail.com')
    expect(auth.user?.provider).toBe('github')
    expect(auth.user?.avatarUrl).toBeUndefined()
  })

  it('should use name field when full_name is not available', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'uuid-789',
            email: 'user@github.com',
            user_metadata: { name: 'GitHub User', picture: 'https://pic.com/u.jpg' },
            app_metadata: { provider: 'github' },
          },
        } as any,
      },
      error: null,
    })

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.user?.displayName).toBe('GitHub User')
    expect(auth.user?.avatarUrl).toBe('https://pic.com/u.jpg')
  })

  it('should default provider to google when app_metadata.provider is missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'uuid-000',
            email: 'x@test.com',
            user_metadata: { full_name: 'X' },
            app_metadata: {},
          },
        } as any,
      },
      error: null,
    })

    const auth = useAuthStore()
    await auth.initialize()

    expect(auth.user?.provider).toBe('google')
  })
})
