import { supabase } from '~/config/supabase'
import { mapDbIngreso, mapIngresoToDb } from '~/config/mappers'
import type { Ingreso, NuevoIngreso } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_ingresos`

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
    let q = supabase.from('ingresos').select('*').eq('user_id', userId)
    if (filter) {
      const start = new Date(filter.year, filter.month - 1, 1).toISOString()
      const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999).toISOString()
      q = q.gte('created_at', start).lte('created_at', end)
    }
    const { data, error } = await q.order('created_at', { ascending: false })
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
    const { data: current, error: fetchErr } = await supabase
      .from('ingresos')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !current) throw new Error('Ingreso not found')
    const payload = {
      id,
      user_id: userId,
      monto: data.monto ?? current.monto,
      descripcion: data.descripcion ?? current.descripcion,
      created_at: current.created_at,
    }
    const { data: row, error } = await supabase
      .from('ingresos')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return mapDbIngreso(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await ingresosApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.rpc('delete_ingreso', { p_id: id })
    if (error) throw error
  },
}
