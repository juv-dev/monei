import { supabase } from '~/config/supabase'
import { mapDbGasto, mapGastoToDb } from '~/config/mappers'
import type { GastoPresupuesto, NuevoGasto } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_presupuesto`

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
    let q = supabase.from('gastos_presupuesto').select('*').eq('user_id', userId)
    if (filter) {
      const start = new Date(filter.year, filter.month - 1, 1).toISOString()
      const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999).toISOString()
      q = q.gte('created_at', start).lte('created_at', end)
    }
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbGasto)
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
    const { data: row, error } = await supabase
      .from('gastos_presupuesto')
      .insert(mapGastoToDb(data, userId))
      .select()
      .single()
    if (error) throw error
    return mapDbGasto(row)
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
    const { data: current, error: fetchError } = await supabase
      .from('gastos_presupuesto')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError || !current) throw new Error('Gasto not found')

    const { data: row, error } = await supabase
      .from('gastos_presupuesto')
      .upsert({
        id,
        user_id: userId,
        monto: data.monto ?? current.monto,
        descripcion: data.descripcion ?? current.descripcion,
        categoria: data.categoria ?? current.categoria,
        created_at: current.created_at,
      })
      .select()
      .single()
    if (error) throw new Error('Gasto not found')
    return mapDbGasto(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await presupuestoApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.rpc('delete_gasto_presupuesto', { p_id: id })
    if (error) throw error
  },
}
