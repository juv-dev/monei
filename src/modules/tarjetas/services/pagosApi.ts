import { supabase } from '~/config/supabase'
import { mapDbPago, mapPagoToDb } from '~/config/mappers'
import type { TarjetaPago, NuevoTarjetaPago } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_tarjeta_pagos`

export const pagosApi = {
  async getAll(userId: string): Promise<TarjetaPago[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as TarjetaPago[]) : []
    }
    const { data, error } = await supabase.from('tarjeta_pagos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbPago)
  },

  async getByTarjeta(userId: string, tarjetaId: string): Promise<TarjetaPago[]> {
    if (userId === DEMO_USER_ID) {
      const all = await pagosApi.getAll(userId)
      return all.filter((p) => p.tarjetaId === tarjetaId)
    }
    const { data, error } = await supabase
      .from('tarjeta_pagos')
      .select('*')
      .eq('user_id', userId)
      .eq('tarjeta_id', tarjetaId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbPago)
  },

  async create(userId: string, data: NuevoTarjetaPago): Promise<TarjetaPago> {
    if (userId === DEMO_USER_ID) {
      const all = await pagosApi.getAll(userId)
      const newItem: TarjetaPago = {
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
      .from('tarjeta_pagos')
      .insert(mapPagoToDb(data, userId))
      .select()
      .single()
    if (error) throw error
    return mapDbPago(row)
  },

  async remove(userId: string, pagoId: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await pagosApi.getAll(userId)
      const filtered = all.filter((p) => p.id !== pagoId)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.rpc('delete_tarjeta_pago', { p_id: pagoId })
    if (error) throw error
  },
}
