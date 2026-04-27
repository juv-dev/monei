import { supabase } from '~/config/supabase'
import { mapDbTarjeta, mapTarjetaToDb } from '~/config/mappers'
import type { TarjetaCredito, NuevaTarjeta } from '../types'

const DEMO_USER_ID = 'demo'
const storageKey = (userId: string) => `finance_${userId}_tarjetas`

export const tarjetasApi = {
  async getAll(userId: string): Promise<TarjetaCredito[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as TarjetaCredito[]) : []
    }
    const { data, error } = await supabase
      .from('tarjetas_credito')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapDbTarjeta)
  },

  async create(userId: string, data: NuevaTarjeta): Promise<TarjetaCredito> {
    if (userId === DEMO_USER_ID) {
      const all = await tarjetasApi.getAll(userId)
      const newItem: TarjetaCredito = {
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
      .from('tarjetas_credito')
      .insert(mapTarjetaToDb(data, userId))
      .select()
      .single()
    if (error) throw error
    return mapDbTarjeta(row)
  },

  async update(userId: string, id: string, data: Partial<NuevaTarjeta>): Promise<TarjetaCredito> {
    if (userId === DEMO_USER_ID) {
      const all = await tarjetasApi.getAll(userId)
      const idx = all.findIndex((item) => item.id === id)
      if (idx === -1) throw new Error('Tarjeta not found')
      all[idx] = { ...all[idx]!, ...data }
      localStorage.setItem(storageKey(userId), JSON.stringify(all))
      return all[idx]!
    }
    const { data: current, error: fetchErr } = await supabase
      .from('tarjetas_credito')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !current) throw new Error('Tarjeta not found')
    const payload = {
      id,
      user_id: userId,
      linea_total: data.lineaTotal ?? current.linea_total,
      monto_deuda_actual: data.montoDeudaActual ?? current.monto_deuda_actual,
      pago_minimo: data.pagoMinimo !== undefined ? (data.pagoMinimo ?? null) : current.pago_minimo,
      saldo_total: data.saldoTotal !== undefined ? (data.saldoTotal ?? null) : current.saldo_total,
      linea_total_usd: data.lineaTotalUsd !== undefined ? (data.lineaTotalUsd ?? null) : current.linea_total_usd,
      monto_deuda_actual_usd:
        data.montoDeudaActualUsd !== undefined
          ? (data.montoDeudaActualUsd ?? null)
          : current.monto_deuda_actual_usd,
      pago_minimo_usd:
        data.pagoMinimoUsd !== undefined ? (data.pagoMinimoUsd ?? null) : current.pago_minimo_usd,
      saldo_total_usd:
        data.saldoTotalUsd !== undefined ? (data.saldoTotalUsd ?? null) : current.saldo_total_usd,
      descripcion: data.descripcion ?? current.descripcion,
      created_at: current.created_at,
    }
    const { data: row, error } = await supabase
      .from('tarjetas_credito')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return mapDbTarjeta(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await tarjetasApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    const { error } = await supabase.rpc('delete_tarjeta', { p_id: id })
    if (error) throw error
  },
}
