import postgres from 'postgres'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal(): void {
  if (process.env.NEON_DATABASE_URL) return
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && !process.env[key]) process.env[key] = value
    }
  } catch {}
}

loadEnvLocal()

interface VercelRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (data: unknown) => void
  end: () => void
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function applyCors(res: VercelResponse): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v)
}

function verifyUser(authHeader: string | undefined): { id: string } | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'),
    )
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

let sql: ReturnType<typeof postgres> | null = null

function getSql(): ReturnType<typeof postgres> {
  if (sql) return sql
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    const envKeys = Object.keys(process.env).filter((k) => k.includes('NEON') || k.includes('DATABASE') || k.includes('VERCEL')).join(', ')
    throw new Error(`NEON_DATABASE_URL not set. Available env keys: ${envKeys}`)
  }
  sql = postgres(url, { ssl: 'require', max: 1, idle_timeout: 20 })
  return sql
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

async function handleOp(req: DbRequest, userId: string): Promise<unknown> {
  if (!ALLOWED_TABLES.has(req.table)) throw new Error(`table not allowed: ${req.table}`)
  const tableIdent = escapeIdent(req.table)
  const client = getSql()

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
    const rows = await client.unsafe(query, params as never[])
    return req.op === 'selectOne' ? rows[0] ?? null : rows
  }

  if (req.op === 'insert') {
    const body = { ...(req.body ?? {}), user_id: userId }
    const cols = Object.keys(body)
    const vals = Object.values(body)
    const colsSql = cols.map(escapeIdent).join(', ')
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ')
    const rows = await client.unsafe(
      `insert into public.${tableIdent} (${colsSql}) values (${placeholders}) returning *`,
      vals as never[],
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
    const rows = await client.unsafe(
      `update public.${tableIdent} set ${setSql} ${whereSql} returning *`,
      [...vals, ...whereParams] as never[],
    )
    return rows[0] ?? null
  }

  if (req.op === 'remove') {
    if (!req.filters) throw new Error('remove requires filters')
    const { clause, params } = buildWhere(req.filters, userId)
    if (!clause) throw new Error('remove requires at least one filter')
    await client.unsafe(`delete from public.${tableIdent} ${clause}`, params as never[])
    return null
  }

  throw new Error(`unsupported op: ${String(req.op)}`)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  const auth = req.headers.authorization
  const authHeader = typeof auth === 'string' ? auth : undefined
  const user = verifyUser(authHeader)
  if (!user) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  try {
    const body = req.body as DbRequest
    const result = await handleOp(body, user.id)
    res.status(200).json({ data: result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal error'
    const stack = e instanceof Error ? e.stack : ''
    process.stderr.write(`[api/db] ERROR: ${message}\n${stack}\n`)
    res.status(400).json({ error: message, body: req.body })
  }
}
