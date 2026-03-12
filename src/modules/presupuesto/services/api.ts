import { supabase } from '~/config/supabase'
import { mapDbGasto, mapGastoToDb } from '~/config/mappers'
import type { GastoPresupuesto, NuevoGasto } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_presupuesto`

export const presupuestoApi = {
  async getAll(userId: string): Promise<GastoPresupuesto[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as GastoPresupuesto[]) : []
    }
    const { data, error } = await supabase
      .from('gastos_presupuesto')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
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
    const updateData: Record<string, unknown> = {}
    if (data.monto !== undefined) updateData.monto = data.monto
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    if (data.categoria !== undefined) updateData.categoria = data.categoria
    const { data: row, error } = await supabase
      .from('gastos_presupuesto')
      .update(updateData)
      .eq('id', id)
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
    const { error } = await supabase.from('gastos_presupuesto').delete().eq('id', id)
    if (error) throw error
  },
}
