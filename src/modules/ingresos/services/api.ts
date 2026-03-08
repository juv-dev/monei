import { supabase } from '~/config/supabase'
import { mapDbIngreso, mapIngresoToDb } from '~/config/mappers'
import type { Ingreso, NuevoIngreso } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_ingresos`

export const ingresosApi = {
  async getAll(userId: string): Promise<Ingreso[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as Ingreso[]) : []
    }
    const { data, error } = await supabase.from('ingresos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbIngreso)
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
    const { data: row, error } = await supabase.from('ingresos').insert(mapIngresoToDb(data, userId)).select().single()
    if (error) throw error
    return mapDbIngreso(row)
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
    const updateData: Record<string, unknown> = {}
    if (data.monto !== undefined) updateData.monto = data.monto
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    const { data: row, error } = await supabase.from('ingresos').update(updateData).eq('id', id).select().single()
    if (error) throw new Error('Ingreso not found')
    return mapDbIngreso(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await ingresosApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.from('ingresos').delete().eq('id', id)
    if (error) throw error
  },
}
