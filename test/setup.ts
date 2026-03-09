import { beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ─── In-memory Supabase store (simulates DB tables) ─────────────────────────
const tables: Record<string, Record<string, unknown>[]> = {}

function getTable(name: string): Record<string, unknown>[] {
  if (!tables[name]) tables[name] = []
  return tables[name]!
}

function clearTables() {
  Object.keys(tables).forEach((k) => delete tables[k])
}

let insertSeq = 0

// Chainable query builder that simulates supabase's fluent API
function createQueryBuilder(tableName: string) {
  const filters: Array<{ col: string; val: unknown }> = []
  let orderCol: string | null = null
  let orderAsc = true
  let insertData: Record<string, unknown> | null = null
  let updateData: Record<string, unknown> | null = null
  let deleteMode = false
  let selectMode = false
  let singleMode = false

  const builder: Record<string, unknown> = {}

  builder.select = () => {
    selectMode = true
    return builder
  }

  builder.insert = (data: Record<string, unknown>) => {
    insertData = { id: `test-uuid-${Math.random().toString(36).slice(2, 10)}`, created_at: new Date(Date.now() + insertSeq++).toISOString(), ...data }
    return builder
  }

  builder.update = (data: Record<string, unknown>) => {
    updateData = data
    return builder
  }

  builder.delete = () => {
    deleteMode = true
    return builder
  }

  builder.eq = (col: string, val: unknown) => {
    filters.push({ col, val })
    return builder
  }

  builder.order = (col: string, opts?: { ascending?: boolean }) => {
    orderCol = col
    orderAsc = opts?.ascending ?? true
    return builder
  }

  builder.single = () => {
    singleMode = true
    return builder
  }

  builder.then = (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
    try {
      const table = getTable(tableName)

      if (insertData) {
        table.push({ ...insertData })
        if (selectMode && singleMode) {
          resolve({ data: { ...insertData }, error: null })
        } else if (selectMode) {
          resolve({ data: [{ ...insertData }], error: null })
        } else {
          resolve({ data: null, error: null })
        }
        return
      }

      if (updateData) {
        let updated: Record<string, unknown> | null = null
        for (const row of table) {
          const match = filters.every((f) => row[f.col] === f.val)
          if (match) {
            Object.assign(row, updateData)
            updated = { ...row }
          }
        }
        if (selectMode && singleMode) {
          if (updated) {
            resolve({ data: updated, error: null })
          } else {
            resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } })
          }
        } else {
          resolve({ data: updated ? [updated] : [], error: null })
        }
        return
      }

      if (deleteMode) {
        const before = table.length
        tables[tableName] = table.filter(
          (row) => !filters.every((f) => row[f.col] === f.val),
        )
        resolve({ data: null, error: null, count: before - (tables[tableName]?.length ?? 0) })
        return
      }

      // Select
      let results = [...table]
      for (const f of filters) {
        results = results.filter((row) => row[f.col] === f.val)
      }
      if (orderCol) {
        const col = orderCol
        const asc = orderAsc
        results.sort((a, b) => {
          const av = String(a[col] ?? '')
          const bv = String(b[col] ?? '')
          return asc ? (av < bv ? -1 : 1) : av > bv ? -1 : 1
        })
      }
      if (singleMode) {
        resolve({ data: results[0] ?? null, error: results[0] ? null : { message: 'Not found' } })
      } else {
        resolve({ data: results, error: null })
      }
    } catch (err) {
      if (reject) reject(err)
    }
  }

  return builder
}

// ─── Supabase mock ──────────────────────────────────────────────────────────
vi.mock('~/config/supabase', () => {
  const authCallbacks: Array<(event: string, session: unknown) => void> = []
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
          authCallbacks.push(cb)
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        }),
      },
      from: vi.fn((tableName: string) => createQueryBuilder(tableName)),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { analysis: {} }, error: null }),
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
  key: (index: number): string | null => Object.keys(sessionStorageStore)[index] ?? null,
}

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
  clearTables()
  uuidCounter = 0
  insertSeq = 0
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ─── Vue Test Utils global config ─────────────────────────────────────────────
config.global.stubs = {}
