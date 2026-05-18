import { neon } from '~/config/neon'
import type { GastoPresupuesto } from '../types'
import type { NuevoGasto } from '~/shared/types'

const DEMO_USER_ID = 'demo'
const TABLE = 'gastos_presupuesto'
const storageKey = (userId: string) => `finance_${userId}_presupuesto`

interface GastoRow {
  id: string
  user_id: string
  monto: number | string
  descripcion: string | null
  categoria: string | null
  created_at: string
}

function mapRow(row: GastoRow): GastoPresupuesto {
  return {
    id: String(row.id),
    monto: Number(row.monto ?? 0),
    descripcion: String(row.descripcion ?? ''),
    categoria: String(row.categoria ?? ''),
    userId: String(row.user_id ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const presupuestoApi = {
  async getAll(userId: string, filter?: { year: number; month: number }): Promise<GastoPresupuesto[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      const all = raw ? (JSON.parse(raw) as GastoPresupuesto[]) : []
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
    const rows = await neon.select<GastoRow>(TABLE, params)
    return rows.map(mapRow)
  },

  async create(userId: string, data: NuevoGasto): Promise<GastoPresupuesto> {
    if (userId === DEMO_USER_ID) {
      const all = await presupuestoApi.getAll(userId)
      const newItem: GastoPresupuesto = {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
        ...data,
      }
      all.push(newItem)
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return newItem
    }
    const row = await neon.insert<GastoRow>(TABLE, {
      user_id: userId,
      monto: data.monto,
      descripcion: data.descripcion,
      categoria: data.categoria,
    })
    return mapRow(row)
  },

  async update(
    userId: string,
    id: string,
    data: { monto?: number; descripcion?: string; categoria?: string },
  ): Promise<GastoPresupuesto> {
    if (userId === DEMO_USER_ID) {
      const all = await presupuestoApi.getAll(userId)
      const idx = all.findIndex((item) => item.id === id)
      if (idx === -1) throw new Error('Gasto not found')
      all[idx] = { ...all[idx]!, ...data }
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return all[idx]!
    }
    const payload: Record<string, unknown> = {}
    if (data.monto !== undefined) payload.monto = data.monto
    if (data.descripcion !== undefined) payload.descripcion = data.descripcion
    if (data.categoria !== undefined) payload.categoria = data.categoria
    const row = await neon.update<GastoRow>(TABLE, { id, user_id: userId }, payload)
    if (!row) throw new Error('Gasto not found')
    return mapRow(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await presupuestoApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    await neon.remove(TABLE, { id, user_id: userId })
  },
}
