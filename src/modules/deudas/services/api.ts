import { supabase } from '~/config/supabase'
import { mapDbDeuda, mapDeudaToDb } from '~/config/mappers'
import type { Deuda, NuevaDeuda } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_deudas`

export const deudasApi = {
  async getAll(userId: string): Promise<Deuda[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as Deuda[]) : []
    }
    const { data, error } = await supabase.from('deudas').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbDeuda)
  },

  async create(userId: string, data: NuevaDeuda): Promise<Deuda> {
    if (userId === DEMO_USER_ID) {
      const all = await deudasApi.getAll(userId)
      const newItem: Deuda = {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
        ...data,
      }
      all.push(newItem)
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return newItem
    }
    const { data: row, error } = await supabase.from('deudas').insert(mapDeudaToDb(data, userId)).select().single()
    if (error) throw error
    return mapDbDeuda(row)
  },

  async update(userId: string, id: string, data: Partial<NuevaDeuda>): Promise<Deuda> {
    if (userId === DEMO_USER_ID) {
      const all = await deudasApi.getAll(userId)
      const idx = all.findIndex((item) => item.id === id)
      if (idx === -1) throw new Error('Deuda not found')
      all[idx] = { ...all[idx]!, ...data }
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return all[idx]!
    }
    const { data: current, error: fetchErr } = await supabase
      .from('deudas')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !current) throw new Error('Deuda not found')
    const payload = {
      id,
      user_id: userId,
      nombre_persona: data.nombrePersona ?? current.nombre_persona,
      total_deuda: data.totalDeuda ?? current.total_deuda,
      tasa_interes: data.tasaInteres ?? current.tasa_interes,
      cuotas_pagadas: data.cuotasPagadas ?? current.cuotas_pagadas,
      total_cuotas:
        data.totalCuotas !== undefined ? (data.totalCuotas ?? null) : current.total_cuotas,
      cuota_mensual:
        data.cuotaMensual !== undefined ? (data.cuotaMensual ?? null) : current.cuota_mensual,
      monto_actual_pendiente: data.montoActualPendiente ?? current.monto_actual_pendiente,
      descripcion: data.descripcion ?? current.descripcion,
      created_at: current.created_at,
    }
    const { data: row, error } = await supabase
      .from('deudas')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return mapDbDeuda(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await deudasApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.rpc('delete_deuda', { p_id: id })
    if (error) throw error
  },
}
