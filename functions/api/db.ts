import { neon } from '@neondatabase/serverless'

interface Env {
  NEON_DATABASE_URL?: string
}

interface EventContext {
  request: Request
  env: Env
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function verifyUser(authHeader: string | null): { id: string } | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: string; exp?: number }
    if (!payload?.sub) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return { id: payload.sub }
  } catch {
    return null
  }
}

const ALLOWED_TABLES = new Set([
  'ingresos',
  'gastos_presupuesto',
  'deudas',
  'tarjetas_credito',
  'tarjeta_pagos',
  'fcm_tokens',
])

type Op = 'select' | 'selectOne' | 'insert' | 'update' | 'remove'

interface DbRequest {
  op: Op
  table: string
  filters?: Record<string, string>
  body?: Record<string, unknown>
  order?: string
  rangeStart?: string
  rangeEnd?: string
  rangeCol?: string
}

let sqlClient: ReturnType<typeof neon> | null = null
let sqlUrl: string | null = null

function getSql(env: Env): ReturnType<typeof neon> {
  const url = env.NEON_DATABASE_URL
  if (!url) throw new Error('NEON_DATABASE_URL not set')
  if (!sqlClient || sqlUrl !== url) {
    sqlClient = neon(url)
    sqlUrl = url
  }
  return sqlClient
}

function parseFilterValue(value: string): { op: string; target: string } | null {
  const idx = value.indexOf('.')
  if (idx === -1) return null
  return { op: value.slice(0, idx), target: value.slice(idx + 1) }
}

function escapeIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`invalid identifier: ${name}`)
  return `"${name}"`
}

function buildWhere(
  filters: Record<string, string>,
  userId: string,
): { clause: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []
  const hasUserFilter = Object.prototype.hasOwnProperty.call(filters, 'user_id')
  for (const [col, raw] of Object.entries(filters)) {
    const parsed = parseFilterValue(raw)
    if (!parsed) continue
    const opMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    }
    const sqlOp = opMap[parsed.op]
    if (!sqlOp) continue
    params.push(parsed.target)
    parts.push(`${escapeIdent(col)} ${sqlOp} $${params.length}`)
  }
  if (!hasUserFilter) {
    params.push(userId)
    parts.push(`"user_id" = $${params.length}`)
  }
  return { clause: parts.length > 0 ? `where ${parts.join(' and ')}` : '', params }
}

async function handleOp(req: DbRequest, userId: string, env: Env): Promise<unknown> {
  if (!ALLOWED_TABLES.has(req.table)) throw new Error(`table not allowed: ${req.table}`)
  const tableIdent = escapeIdent(req.table)
  const client = getSql(env)

  if (req.op === 'select' || req.op === 'selectOne') {
    const filters = req.filters ?? { user_id: `eq.${userId}` }
    const { clause, params } = buildWhere(filters, userId)
    let query = `select * from public.${tableIdent} ${clause}`
    if (req.rangeStart && req.rangeEnd && req.rangeCol) {
      params.push(req.rangeStart, req.rangeEnd)
      const rangeClause = `${escapeIdent(req.rangeCol)} >= $${params.length - 1} and ${escapeIdent(req.rangeCol)} <= $${params.length}`
      query = clause
        ? `${query} and ${rangeClause}`
        : `select * from public.${tableIdent} where ${rangeClause}`
    }
    if (req.order) {
      const [col, dir] = req.order.split('.')
      if (col && (dir === 'asc' || dir === 'desc')) {
        query = `${query} order by ${escapeIdent(col)} ${dir}`
      }
    }
    if (req.op === 'selectOne') query = `${query} limit 1`
    const rows = await client.query(query, params)
    return req.op === 'selectOne' ? (rows[0] ?? null) : rows
  }

  if (req.op === 'insert') {
    const body = { ...(req.body ?? {}), user_id: userId }
    const cols = Object.keys(body)
    const vals = Object.values(body)
    const colsSql = cols.map(escapeIdent).join(', ')
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ')
    const rows = await client.query(
      `insert into public.${tableIdent} (${colsSql}) values (${placeholders}) returning *`,
      vals,
    )
    return rows[0] ?? null
  }

  if (req.op === 'update') {
    if (!req.body) throw new Error('update requires body')
    if (!req.filters) throw new Error('update requires filters')
    const cols = Object.keys(req.body)
    if (cols.length === 0) throw new Error('update body is empty')
    const vals = Object.values(req.body)
    const setSql = cols.map((c, i) => `${escapeIdent(c)} = $${i + 1}`).join(', ')
    const { clause, params: whereParams } = buildWhere(req.filters, userId)
    const offsetParams = whereParams.map((_, i) => `$${i + 1 + vals.length}`)
    let whereSql = clause
    for (let i = whereParams.length - 1; i >= 0; i--) {
      whereSql = whereSql.replace(`$${i + 1}`, offsetParams[i] ?? '')
    }
    const rows = await client.query(
      `update public.${tableIdent} set ${setSql} ${whereSql} returning *`,
      [...vals, ...whereParams],
    )
    return rows[0] ?? null
  }

  if (req.op === 'remove') {
    if (!req.filters) throw new Error('remove requires filters')
    const { clause, params } = buildWhere(req.filters, userId)
    if (!clause) throw new Error('remove requires at least one filter')
    await client.query(`delete from public.${tableIdent} ${clause}`, params)
    return null
  }

  throw new Error(`unsupported op: ${String(req.op)}`)
}

export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  const user = verifyUser(request.headers.get('authorization'))
  if (!user) return json({ error: 'unauthorized' }, 401)

  let body: DbRequest
  try {
    body = (await request.json()) as DbRequest
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  try {
    const result = await handleOp(body, user.id, env)
    return json({ data: result }, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal error'
    return json({ error: message }, 400)
  }
}
