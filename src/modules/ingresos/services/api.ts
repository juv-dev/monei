import { neon } from '~/config/neon'
import type { Ingreso, NuevoIngreso } from '../types'

const DEMO_USER_ID = 'demo'
const TABLE = 'ingresos'
const storageKey = (userId: string) => `finance_${userId}_ingresos`

interface IngresoRow {
  id: string
  user_id: string
  monto: number | string
  descripcion: string | null
  created_at: string
}

function mapRow(row: IngresoRow): Ingreso {
  return {
    id: String(row.id),
    monto: Number(row.monto ?? 0),
    descripcion: String(row.descripcion ?? ''),
    userId: String(row.user_id ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const ingresosApi = {
  async getAll(userId: string, filter?: { year: number; month: number }): Promise<Ingreso[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      const all = raw ? (JSON.parse(raw) as Ingreso[]) : []
      if (!filter) return all
      return all.filter((item) => {
        const d = new Date(item.createdAt)
        return d.getFullYear() === filter.year && d.getMonth() + 1 === filter.month
      })
    }
    const params: Record<string, string | string[]> = {
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
    }
    if (filter) {
      const start = new Date(filter.year, filter.month - 1, 1).toISOString()
      const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999).toISOString()
      params.created_at = [`gte.${start}`, `lte.${end}`]
    }
    const rows = await neon.select<IngresoRow>(TABLE, params)
    return rows.map(mapRow)
  },

  async create(userId: string, data: NuevoIngreso): Promise<Ingreso> {
    if (userId === DEMO_USER_ID) {
      const all = await ingresosApi.getAll(userId)
      const newItem: Ingreso = {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
        ...data,
      }
      all.push(newItem)
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return newItem
    }
    const row = await neon.insert<IngresoRow>(TABLE, {
      user_id: userId,
      monto: data.monto,
      descripcion: data.descripcion,
    })
    return mapRow(row)
  },

  async update(userId: string, id: string, data: Partial<NuevoIngreso>): Promise<Ingreso> {
    if (userId === DEMO_USER_ID) {
      const all = await ingresosApi.getAll(userId)
      const idx = all.findIndex((item) => item.id === id)
      if (idx === -1) throw new Error('Ingreso not found')
      all[idx] = { ...all[idx]!, ...data }
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return all[idx]!
    }
    const payload: Record<string, unknown> = {}
    if (data.monto !== undefined) payload.monto = data.monto
    if (data.descripcion !== undefined) payload.descripcion = data.descripcion
    const row = await neon.update<IngresoRow>(TABLE, { id, user_id: userId }, payload)
    if (!row) throw new Error('Ingreso not found')
    return mapRow(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await ingresosApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    await neon.remove(TABLE, { id, user_id: userId })
  },
}
