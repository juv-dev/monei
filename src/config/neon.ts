const DB_ENDPOINT = '/api/db'

let _authToken: string | null = null

export function setNeonToken(token: string | null): void {
  _authToken = token
}

type Op = 'select' | 'selectOne' | 'insert' | 'update' | 'remove'

interface DbPayload {
  op: Op
  table: string
  filters?: Record<string, string>
  body?: Record<string, unknown>
  order?: string
  rangeStart?: string
  rangeEnd?: string
  rangeCol?: string
}

function extractPostgrestParams(params: Record<string, string | string[]> | undefined): {
  filters: Record<string, string>
  order?: string
  rangeStart?: string
  rangeEnd?: string
  rangeCol?: string
} {
  const filters: Record<string, string> = {}
  let order: string | undefined
  let rangeStart: string | undefined
  let rangeEnd: string | undefined
  let rangeCol: string | undefined
  if (!params) return { filters }
  for (const [key, value] of Object.entries(params)) {
    if (key === 'order' && typeof value === 'string') {
      order = value
      continue
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v.startsWith('gte.')) {
          rangeStart = v.slice(4)
          rangeCol = key
        } else if (v.startsWith('lte.')) {
          rangeEnd = v.slice(4)
          rangeCol = key
        }
      }
      continue
    }
    filters[key] = value
  }
  return { filters, order, rangeStart, rangeEnd, rangeCol }
}

async function call<T>(payload: DbPayload): Promise<T> {
  const res = await fetch(DB_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DB ${res.status}: ${text || res.statusText}`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

export const neon = {
  async select<T>(table: string, params?: Record<string, string | string[]>): Promise<T[]> {
    const extracted = extractPostgrestParams(params)
    const result = await call<T[] | null>({ op: 'select', table, ...extracted })
    return result ?? []
  },

  async selectOne<T>(table: string, params?: Record<string, string | string[]>): Promise<T | null> {
    const extracted = extractPostgrestParams(params)
    return call<T | null>({ op: 'selectOne', table, ...extracted })
  },

  async insert<T>(table: string, body: Record<string, unknown>): Promise<T> {
    const result = await call<T | null>({ op: 'insert', table, body })
    if (!result) throw new Error(`insert returned empty for ${table}`)
    return result
  },

  async update<T>(
    table: string,
    filters: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<T | null> {
    const filtersPostgrest: Record<string, string> = {}
    for (const [k, v] of Object.entries(filters)) filtersPostgrest[k] = `eq.${v}`
    return call<T | null>({ op: 'update', table, filters: filtersPostgrest, body })
  },

  async remove(table: string, filters: Record<string, string>): Promise<void> {
    const filtersPostgrest: Record<string, string> = {}
    for (const [k, v] of Object.entries(filters)) filtersPostgrest[k] = `eq.${v}`
    await call<null>({ op: 'remove', table, filters: filtersPostgrest })
  },
}
