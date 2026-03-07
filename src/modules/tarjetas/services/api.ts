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
    const updateData: Record<string, unknown> = {}
    if (data.lineaTotal !== undefined) updateData.linea_total = data.lineaTotal
    if (data.montoDeudaActual !== undefined) updateData.monto_deuda_actual = data.montoDeudaActual
    if (data.pagoMinimo !== undefined) updateData.pago_minimo = data.pagoMinimo
    if (data.saldoTotal !== undefined) updateData.saldo_total = data.saldoTotal
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    const { data: row, error } = await supabase
      .from('tarjetas_credito')
      .update(updateData)
      .eq('id', id)
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
    const { error } = await supabase.from('tarjetas_credito').delete().eq('id', id)
    if (error) throw error
  },
}
