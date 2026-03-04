import { beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── Supabase mock ──────────────────────────────────────────────────────────
vi.mock('~/config/supabase', () => {
  const authCallbacks: Array<(event: string, session: unknown) => void> = []
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
          authCallbacks.push(cb)
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        }),
      },
      _authCallbacks: authCallbacks,
    },
  }
})

// ─── localStorage mock ────────────────────────────────────────────────────────
const localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string): string | null => localStorageStore[key] ?? null,
  setItem: (key: string, value: string): void => {
    localStorageStore[key] = value
  },
  removeItem: (key: string): void => {
    delete localStorageStore[key]
  },
  clear: (): void => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (index: number): string | null => Object.keys(localStorageStore)[index] ?? null,
}

// ─── sessionStorage mock ──────────────────────────────────────────────────────
const sessionStorageStore: Record<string, string> = {}

const sessionStorageMock = {
  getItem: (key: string): string | null => sessionStorageStore[key] ?? null,
  setItem: (key: string, value: string): void => {
    sessionStorageStore[key] = value
  },
  removeItem: (key: string): void => {
    delete sessionStorageStore[key]
  },
  clear: (): void => {
    Object.keys(sessionStorageStore).forEach((k) => delete sessionStorageStore[k])
  },
  get length() {
    return Object.keys(sessionStorageStore).length
  },
  key: (index: number): string | null =>
    Object.keys(sessionStorageStore)[index] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
})

// ─── crypto.randomUUID mock ───────────────────────────────────────────────────
let uuidCounter = 0

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${(++uuidCounter).toString().padStart(4, '0')}`,
  },
  writable: true,
  configurable: true,
})

// ─── Reset entre tests ────────────────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear()
  sessionStorageMock.clear()
  uuidCounter = 0
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ─── Vue Test Utils global config ─────────────────────────────────────────────
config.global.stubs = {}
