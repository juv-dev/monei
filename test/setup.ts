import { beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { shallowRef, ref } from 'vue'

vi.mock('@clerk/vue', () => ({
  useClerk: () => shallowRef(null),
  useUser: () => ({ user: shallowRef(null), isLoaded: ref(false) }),
  useSignIn: () => ({ signIn: shallowRef(null) }),
  useAuth: () => ({ isSignedIn: ref(false), userId: ref(null) }),
}))

const neonStore: Map<string, Record<string, unknown>[]> = new Map()
let neonIdSeq = 0
let neonInsertSeq = 0

function getNeonTable(name: string): Record<string, unknown>[] {
  let table = neonStore.get(name)
  if (!table) {
    table = []
    neonStore.set(name, table)
  }
  return table
}

function clearNeonStore() {
  neonStore.clear()
  neonIdSeq = 0
  neonInsertSeq = 0
}

function parseFilter(value: string): { op: string; target: string } | null {
  const idx = value.indexOf('.')
  if (idx === -1) return null
  return { op: value.slice(0, idx), target: value.slice(idx + 1) }
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const as = String(a ?? '')
  const bs = String(b ?? '')
  if (as < bs) return -1
  if (as > bs) return 1
  return 0
}

function matchFilter(rowValue: unknown, op: string, target: string): boolean {
  switch (op) {
    case 'eq':
      return String(rowValue ?? '') === target
    case 'neq':
      return String(rowValue ?? '') !== target
    case 'gte':
      return compareValues(rowValue, target) >= 0
    case 'lte':
      return compareValues(rowValue, target) <= 0
    case 'gt':
      return compareValues(rowValue, target) > 0
    case 'lt':
      return compareValues(rowValue, target) < 0
    default:
      return false
  }
}

function applyParams(
  rows: Record<string, unknown>[],
  params?: Record<string, string | string[]>,
): Record<string, unknown>[] {
  if (!params) return [...rows]
  let results = [...rows]
  let orderField: string | null = null
  let orderDesc = false

  for (const [key, value] of Object.entries(params)) {
    if (key === 'select') continue
    if (key === 'order') {
      const raw = Array.isArray(value) ? value[0] ?? '' : value
      const [field, dir] = raw.split('.')
      orderField = field ?? null
      orderDesc = dir === 'desc'
      continue
    }
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      const parsed = parseFilter(v)
      if (!parsed) continue
      results = results.filter((row) => matchFilter(row[key], parsed.op, parsed.target))
    }
  }

  if (orderField) {
    const field = orderField
    const dir = orderDesc ? -1 : 1
    results.sort((a, b) => compareValues(a[field], b[field]) * dir)
  }

  return results
}

function nextNeonId(): string {
  return `neon-id-${++neonIdSeq}`
}

function nextCreatedAt(): string {
  return new Date(Date.now() + neonInsertSeq++).toISOString()
}

vi.mock('~/config/neon', () => {
  return {
    setNeonToken: vi.fn(),
    neon: {
      async select<T>(table: string, params?: Record<string, string | string[]>): Promise<T[]> {
        const rows = applyParams(getNeonTable(table), params)
        return rows.map((r) => ({ ...r })) as T[]
      },
      async selectOne<T>(table: string, params?: Record<string, string | string[]>): Promise<T | null> {
        const rows = applyParams(getNeonTable(table), params)
        return rows[0] ? ({ ...rows[0] } as T) : null
      },
      async insert<T>(table: string, body: Record<string, unknown>): Promise<T> {
        const row: Record<string, unknown> = {
          id: nextNeonId(),
          created_at: nextCreatedAt(),
          ...body,
        }
        getNeonTable(table).push(row)
        return { ...row } as T
      },
      async update<T>(
        table: string,
        filters: Record<string, string>,
        body: Record<string, unknown>,
      ): Promise<T | null> {
        const rows = getNeonTable(table)
        let updated: Record<string, unknown> | null = null
        for (const row of rows) {
          const match = Object.entries(filters).every(
            ([col, val]) => String(row[col] ?? '') === String(val),
          )
          if (match) {
            Object.assign(row, body)
            updated = { ...row }
          }
        }
        return updated as T | null
      },
      async remove(table: string, filters: Record<string, string>): Promise<void> {
        const rows = getNeonTable(table)
        const kept = rows.filter(
          (row) => !Object.entries(filters).every(([col, val]) => String(row[col] ?? '') === String(val)),
        )
        neonStore.set(table, kept)
      },
    },
  }
})

const originalFetch = globalThis.fetch

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof originalFetch === 'function') {
    return originalFetch(input as RequestInfo, init)
  }
  return new Response('Not Found', { status: 404 })
})

Object.defineProperty(globalThis, 'fetch', {
  value: fetchMock,
  writable: true,
  configurable: true,
})

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

let uuidCounter = 0

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${(++uuidCounter).toString().padStart(4, '0')}`,
  },
  writable: true,
  configurable: true,
})

beforeEach(() => {
  localStorageMock.clear()
  sessionStorageMock.clear()
  clearNeonStore()
  uuidCounter = 0
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

config.global.stubs = {}
