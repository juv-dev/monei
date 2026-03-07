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
    const { data, error } = await supabase
      .from('deudas')
      .select('*')
      .order('created_at', { ascending: false })
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
    const { data: row, error } = await supabase
      .from('deudas')
      .insert(mapDeudaToDb(data, userId))
      .select()
      .single()
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
    const updateData: Record<string, unknown> = {}
    if (data.nombrePersona !== undefined) updateData.nombre_persona = data.nombrePersona
    if (data.totalDeuda !== undefined) updateData.total_deuda = data.totalDeuda
    if (data.tasaInteres !== undefined) updateData.tasa_interes = data.tasaInteres
    if (data.cuotasPagadas !== undefined) updateData.cuotas_pagadas = data.cuotasPagadas
    if (data.totalCuotas !== undefined) updateData.total_cuotas = data.totalCuotas
    if (data.cuotaMensual !== undefined) updateData.cuota_mensual = data.cuotaMensual
    if (data.montoActualPendiente !== undefined)
      updateData.monto_actual_pendiente = data.montoActualPendiente
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    const { data: row, error } = await supabase
      .from('deudas')
      .update(updateData)
      .eq('id', id)
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
    const { error } = await supabase.from('deudas').delete().eq('id', id)
    if (error) throw error
  },
}
