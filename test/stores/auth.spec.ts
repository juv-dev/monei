import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => {
  const { ref, shallowRef } = require('vue') as typeof import('vue')
  return {
    clerkValue: null as unknown,
    clerkUser: shallowRef<unknown>(null),
    isLoaded: ref(false),
    signInValue: null as unknown,
  }
})

vi.mock('@clerk/vue', () => ({
  useClerk: () => ({ get value() { return mocks.clerkValue } }),
  useUser: () => ({
    user: mocks.clerkUser,
    isLoaded: mocks.isLoaded,
  }),
  useSignIn: () => ({ signIn: { get value() { return mocks.signInValue } } }),
  useAuth: () => ({ isSignedIn: { value: false }, userId: { value: null } }),
}))

import { useAuthStore } from '~/stores/auth'

describe('should useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    mocks.clerkValue = null
    mocks.clerkUser.value = null
    mocks.isLoaded.value = false
    mocks.signInValue = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have null user and not authenticated initially', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.currentUser).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.userId).toBe('')
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

  it('should sign in as demo user', () => {
    const auth = useAuthStore()
    void auth.signInAsDemo()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('demo')
    expect(auth.user?.username).toBe('demo@monei.app')
    expect(auth.user?.displayName).toBe('Demo')
    expect(auth.user?.provider).toBe('demo')
    expect(sessionStorage.getItem('monei_demo_session')).toBe('1')
  })

  it('should logout demo user and clear sessionStorage', async () => {
    const auth = useAuthStore()
    void auth.signInAsDemo()
    await auth.logout()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('monei_demo_session')).toBeNull()
  })

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

  it('should return userId from user id', () => {
    const auth = useAuthStore()
    void auth.signInAsDemo()
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
    void auth.signInAsDemo()
    expect(auth.currentUser).not.toBeNull()
    expect(auth.isLoggedIn).toBe(true)
  })

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

  it('should return success when password change succeeds with null clerkUser', async () => {
    const auth = useAuthStore()
    const result = await auth.changePassword('old', 'newPass123', 'newPass123')
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return clerk longMessage error when changePassword throws clerk error', async () => {
    mocks.clerkUser.value = {
      updatePassword: vi.fn().mockRejectedValue({
        errors: [{ longMessage: 'Incorrect current password' }],
      }),
    }
    const auth = useAuthStore()
    const result = await auth.changePassword('wrong', 'newPass123', 'newPass123')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Incorrect current password')
  })

  it('should return clerk message error when longMessage is absent', async () => {
    mocks.clerkUser.value = {
      updatePassword: vi.fn().mockRejectedValue({
        errors: [{ message: 'Password too weak' }],
      }),
    }
    const auth = useAuthStore()
    const result = await auth.changePassword('old', 'newPass123', 'newPass123')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Password too weak')
  })

  it('should return generic error when changePassword throws non-clerk error', async () => {
    mocks.clerkUser.value = {
      updatePassword: vi.fn().mockRejectedValue(new Error('Unexpected error')),
    }
    const auth = useAuthStore()
    const result = await auth.changePassword('old', 'newPass123', 'newPass123')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unexpected error')
  })

  it('should initialize without crash when clerk is not loaded and no demo session', async () => {
    const auth = useAuthStore()
    await auth.initialize()
    expect(auth.isLoading).toBe(true)
    expect(auth.user).toBeNull()
  })

  it('should return empty object from signInWithGoogle when signIn is null', async () => {
    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()
    expect(result).toEqual({})
    expect(result.error).toBeUndefined()
  })

  it('should return empty object from signInWithApple when signIn is null', async () => {
    const auth = useAuthStore()
    const result = await auth.signInWithApple()
    expect(result).toEqual({})
    expect(result.error).toBeUndefined()
  })

  it('should return network error from signInWithGoogle when fetch fails', async () => {
    mocks.signInValue = {
      authenticateWithRedirect: vi.fn().mockRejectedValue(new Error('failed to fetch')),
    }
    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()
    expect(result.error).toContain('conexión')
  })

  it('should return network error from signInWithApple when fetch fails', async () => {
    mocks.signInValue = {
      authenticateWithRedirect: vi.fn().mockRejectedValue(new Error('network error')),
    }
    const auth = useAuthStore()
    const result = await auth.signInWithApple()
    expect(result.error).toContain('conexión')
  })

  it('should return generic error from signInWithGoogle when non-network error occurs', async () => {
    mocks.signInValue = {
      authenticateWithRedirect: vi.fn().mockRejectedValue(new Error('Something went wrong')),
    }
    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()
    expect(result.error).toBe('Something went wrong')
  })

  it('should return generic fallback error when non-Error is thrown in signInWithGoogle', async () => {
    mocks.signInValue = {
      authenticateWithRedirect: vi.fn().mockRejectedValue('plain string error'),
    }
    const auth = useAuthStore()
    const result = await auth.signInWithGoogle()
    expect(result.error).toBe('Error al iniciar sesión')
  })

  it('should return clerk unavailable error from signUpWithEmail when clerk is null', async () => {
    const auth = useAuthStore()
    const result = await auth.signUpWithEmail('test@test.com', 'pass123')
    expect(result.error).toBe('Clerk no está disponible')
  })

  it('should return empty object from signUpWithEmail when signup succeeds', async () => {
    const prepareVerification = vi.fn().mockResolvedValue(undefined)
    mocks.clerkValue = {
      client: {
        signUp: {
          create: vi.fn().mockResolvedValue({ id: 'su-1', status: 'missing_requirements' }),
          prepareEmailAddressVerification: prepareVerification,
        },
      },
    }
    const auth = useAuthStore()
    const result = await auth.signUpWithEmail('new@test.com', 'pass123')
    expect(result).toEqual({})
    expect(prepareVerification).toHaveBeenCalled()
  })

  it('should return clerk error from signUpWithEmail when clerk throws clerk errors', async () => {
    mocks.clerkValue = {
      client: {
        signUp: {
          create: vi.fn().mockRejectedValue({ errors: [{ longMessage: 'Email already in use' }] }),
          prepareEmailAddressVerification: vi.fn(),
        },
      },
    }
    const auth = useAuthStore()
    const result = await auth.signUpWithEmail('dup@test.com', 'pass123')
    expect(result.error).toBe('Email already in use')
  })

  it('should return resolveAuthError from signUpWithEmail when generic error is thrown', async () => {
    mocks.clerkValue = {
      client: {
        signUp: {
          create: vi.fn().mockRejectedValue(new Error('fetch failed')),
          prepareEmailAddressVerification: vi.fn(),
        },
      },
    }
    const auth = useAuthStore()
    const result = await auth.signUpWithEmail('test@test.com', 'pass123')
    expect(result.error).toContain('conexión')
  })

  it('should return clerk unavailable error from signInWithEmail when clerk is null', async () => {
    const auth = useAuthStore()
    const result = await auth.signInWithEmail('test@test.com', 'pass123')
    expect(result.error).toBe('Clerk no está disponible')
  })

  it('should return empty object from signInWithEmail when sign in succeeds with non-complete status', async () => {
    mocks.clerkValue = {
      client: {
        signIn: {
          create: vi.fn().mockResolvedValue({ status: 'needs_first_factor', createdSessionId: null }),
        },
      },
      setActive: vi.fn(),
    }
    const auth = useAuthStore()
    const result = await auth.signInWithEmail('user@test.com', 'pass123')
    expect(result).toEqual({})
  })

  it('should call setActive when signInWithEmail returns complete status', async () => {
    const setActive = vi.fn().mockResolvedValue(undefined)
    mocks.clerkValue = {
      client: {
        signIn: {
          create: vi.fn().mockResolvedValue({ status: 'complete', createdSessionId: 'sess-1' }),
        },
      },
      setActive,
    }
    const auth = useAuthStore()
    const result = await auth.signInWithEmail('user@test.com', 'pass123')
    expect(result).toEqual({})
    expect(setActive).toHaveBeenCalledWith({ session: 'sess-1' })
  })

  it('should return clerk error from signInWithEmail when clerk throws clerk errors', async () => {
    mocks.clerkValue = {
      client: {
        signIn: {
          create: vi.fn().mockRejectedValue({ errors: [{ longMessage: 'Invalid credentials' }] }),
        },
      },
    }
    const auth = useAuthStore()
    const result = await auth.signInWithEmail('user@test.com', 'wrong')
    expect(result.error).toBe('Invalid credentials')
  })

  it('should call clerk signOut when logging out a non-demo user', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    mocks.clerkValue = { signOut }
    const auth = useAuthStore()
    auth.$patch({
      user: { id: 'u1', username: 'u@test.com', displayName: 'U', provider: 'google' },
      isAuthenticated: true,
    })
    await auth.logout()
    expect(signOut).toHaveBeenCalled()
    expect(auth.user).toBeNull()
    expect(auth.isTokenReady).toBe(false)
  })

  it('should reset inactivity timer on window activity event when authenticated', async () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    auth.$patch({
      user: { id: 'u1', username: 'u@e.com', displayName: 'U', provider: 'google' },
      isAuthenticated: true,
    })
    expect(() => {
      window.dispatchEvent(new MouseEvent('mousedown'))
      window.dispatchEvent(new KeyboardEvent('keydown'))
    }).not.toThrow()
  })

  it('should not restart inactivity timer on window activity when not authenticated', () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    expect(() => {
      window.dispatchEvent(new MouseEvent('mousedown'))
    }).not.toThrow()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('should clear timer state on logout and stop inactivity timer', async () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    void auth.signInAsDemo()
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isTokenReady).toBe(false)
  })

  it('should set isTokenReady true when demo session is initialized', async () => {
    sessionStorage.setItem('monei_demo_session', '1')
    const auth = useAuthStore()
    await auth.initialize()
    expect(auth.isTokenReady).toBe(true)
  })

  it('should map clerkUser with google provider', async () => {
    mocks.clerkUser.value = {
      id: 'clerk-1',
      firstName: 'John',
      lastName: 'Doe',
      primaryEmailAddress: { emailAddress: 'john@gmail.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: 'https://img.com/pic.jpg',
    }
    mocks.isLoaded.value = true
    await flushPromises()

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user?.provider).toBe('google')
  })

  it('should map clerkUser with github provider', async () => {
    mocks.clerkUser.value = {
      id: 'clerk-2',
      firstName: 'Jane',
      lastName: 'Smith',
      primaryEmailAddress: { emailAddress: 'jane@github.com' },
      externalAccounts: [{ provider: 'github' }],
      imageUrl: null,
    }
    mocks.isLoaded.value = true
    await flushPromises()

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user?.provider).toBe('github')
  })

  it('should map clerkUser with email provider when no external accounts', async () => {
    mocks.clerkUser.value = {
      id: 'clerk-email',
      firstName: 'Email',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'email@test.com' },
      externalAccounts: [],
      imageUrl: null,
    }
    mocks.isLoaded.value = true
    await flushPromises()

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user?.provider).toBe('email')
    expect(auth.user?.displayName).toBe('Email User')
  })

  it('should use email as displayName fallback when no first or last name', async () => {
    mocks.clerkUser.value = {
      id: 'clerk-noname',
      firstName: null,
      lastName: null,
      primaryEmailAddress: { emailAddress: 'noname@test.com' },
      externalAccounts: [],
      imageUrl: null,
    }
    mocks.isLoaded.value = true
    await flushPromises()

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user?.displayName).toBe('noname@test.com')
  })

  it('should use id as displayName and username fallback when no name or email', async () => {
    mocks.clerkUser.value = {
      id: 'clerk-noemail',
      firstName: null,
      lastName: null,
      primaryEmailAddress: null,
      externalAccounts: [],
      imageUrl: null,
    }
    mocks.isLoaded.value = true
    await flushPromises()

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user?.displayName).toBe('clerk-noemail')
    expect(auth.user?.username).toBe('clerk-noemail')
  })

  it('should set isTokenReady true when getToken returns a valid token', async () => {
    mocks.clerkValue = {
      session: { getToken: vi.fn().mockResolvedValue('valid-token') },
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    mocks.clerkUser.value = {
      id: 'clerk-token',
      firstName: 'T',
      lastName: null,
      primaryEmailAddress: { emailAddress: 't@test.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: null,
    }
    mocks.isLoaded.value = true

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.isTokenReady).toBe(true)
  })

  it('should return false and clear token when getToken throws in fetchAndSetToken', async () => {
    mocks.clerkValue = {
      session: { getToken: vi.fn().mockRejectedValue(new Error('token fetch failed')) },
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    mocks.clerkUser.value = {
      id: 'clerk-catch',
      firstName: 'X',
      lastName: 'Y',
      primaryEmailAddress: { emailAddress: 'x@y.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: null,
    }
    mocks.isLoaded.value = true

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.isTokenReady).toBe(false)
  })

  it('should set isLoading false via watcher when clerkLoaded is true and no clerk user', async () => {
    mocks.isLoaded.value = true
    mocks.clerkUser.value = null

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user).toBeNull()
    expect(auth.isLoading).toBe(false)
  })

  it('should skip watcher body when clerkLoaded is true but demo session is active', async () => {
    sessionStorage.setItem('monei_demo_session', '1')
    mocks.isLoaded.value = true

    const auth = useAuthStore()
    await flushPromises()

    expect(auth.user).toBeNull()
  })

  it('should complete initialize and return when clerkLoaded is already true with no user', async () => {
    mocks.isLoaded.value = true
    mocks.clerkUser.value = null

    const auth = useAuthStore()
    await flushPromises()
    await auth.initialize()

    expect(auth.isLoading).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('should complete initialize with fetchAndSetToken when clerkLoaded is true and user exists', async () => {
    mocks.isLoaded.value = true
    mocks.clerkUser.value = {
      id: 'clerk-init2',
      firstName: 'Init',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'init@test.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: null,
    }

    const auth = useAuthStore()
    await flushPromises()
    await auth.initialize()

    expect(auth.isLoading).toBe(false)
    expect(auth.user?.provider).toBe('google')
  })

  it('should return resolveAuthError from signInWithEmail when non-clerk Error is thrown', async () => {
    mocks.clerkValue = {
      client: {
        signIn: {
          create: vi.fn().mockRejectedValue(new Error('unexpected failure')),
        },
      },
    }
    const auth = useAuthStore()
    const result = await auth.signInWithEmail('user@test.com', 'pass')
    expect(result.error).toBe('unexpected failure')
  })

  it('should call fetchAndSetToken periodically via setInterval callback', async () => {
    vi.useFakeTimers()
    mocks.clerkValue = {
      session: { getToken: vi.fn().mockResolvedValue('periodic-token') },
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    mocks.clerkUser.value = {
      id: 'clerk-interval',
      firstName: 'A',
      lastName: 'B',
      primaryEmailAddress: { emailAddress: 'a@b.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: null,
    }
    mocks.isLoaded.value = true

    const auth = useAuthStore()
    await flushPromises()

    vi.advanceTimersByTime(51_000)
    await flushPromises()

    expect(auth.isTokenReady).toBe(true)
  })

  it('should logout automatically when inactivity timeout fires', async () => {
    vi.useFakeTimers()
    mocks.clerkValue = {
      session: { getToken: vi.fn().mockResolvedValue('t') },
      signOut: vi.fn().mockResolvedValue(undefined),
    }
    mocks.clerkUser.value = {
      id: 'clerk-inactivity',
      firstName: 'C',
      lastName: 'D',
      primaryEmailAddress: { emailAddress: 'c@d.com' },
      externalAccounts: [{ provider: 'google' }],
      imageUrl: null,
    }
    mocks.isLoaded.value = true

    const auth = useAuthStore()
    await flushPromises()
    expect(auth.isAuthenticated).toBe(true)

    vi.advanceTimersByTime(30 * 60 * 1000 + 1)
    await flushPromises()

    expect(auth.isAuthenticated).toBe(false)
  })

  it('should not reset inactivity timer when user provider is demo', () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    void auth.signInAsDemo()
    expect(() => {
      window.dispatchEvent(new MouseEvent('mousedown'))
    }).not.toThrow()
    expect(auth.isAuthenticated).toBe(true)
  })
})
