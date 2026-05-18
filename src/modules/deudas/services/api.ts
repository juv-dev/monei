import { neon } from '~/config/neon'
import type { Deuda, NuevaDeuda } from '../types'

const DEMO_USER_ID = 'demo'
const TABLE = 'deudas'
const storageKey = (userId: string) => `finance_${userId}_deudas`

interface DeudaRow {
  id: string
  user_id: string
  nombre_persona: string | null
  total_deuda: number | string
  tasa_interes: number | string
  cuotas_pagadas: number | string
  total_cuotas: number | string | null
  cuota_mensual: number | string | null
  monto_actual_pendiente: number | string
  descripcion: string | null
  created_at: string
}

function mapRow(row: DeudaRow): Deuda {
  return {
    id: String(row.id),
    nombrePersona: String(row.nombre_persona ?? ''),
    totalDeuda: Number(row.total_deuda ?? 0),
    tasaInteres: Number(row.tasa_interes ?? 0),
    cuotasPagadas: Number(row.cuotas_pagadas ?? 0),
    totalCuotas: row.total_cuotas != null ? Number(row.total_cuotas) : undefined,
    cuotaMensual: row.cuota_mensual != null ? Number(row.cuota_mensual) : undefined,
    montoActualPendiente: Number(row.monto_actual_pendiente ?? 0),
    descripcion: String(row.descripcion ?? ''),
    userId: String(row.user_id ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const deudasApi = {
  async getAll(userId: string): Promise<Deuda[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as Deuda[]) : []
    }
    const rows = await neon.select<DeudaRow>(TABLE, {
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
    })
    return rows.map(mapRow)
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
    const payload: Record<string, unknown> = {
      user_id: userId,
      nombre_persona: data.nombrePersona,
      total_deuda: data.totalDeuda,
      tasa_interes: data.tasaInteres,
      cuotas_pagadas: data.cuotasPagadas,
      monto_actual_pendiente: data.montoActualPendiente,
      descripcion: data.descripcion,
    }
    if (data.totalCuotas !== undefined) payload.total_cuotas = data.totalCuotas
    if (data.cuotaMensual !== undefined) payload.cuota_mensual = data.cuotaMensual
    const row = await neon.insert<DeudaRow>(TABLE, payload)
    return mapRow(row)
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
    const payload: Record<string, unknown> = {}
    if (data.nombrePersona !== undefined) payload.nombre_persona = data.nombrePersona
    if (data.totalDeuda !== undefined) payload.total_deuda = data.totalDeuda
    if (data.tasaInteres !== undefined) payload.tasa_interes = data.tasaInteres
    if (data.cuotasPagadas !== undefined) payload.cuotas_pagadas = data.cuotasPagadas
    if (data.totalCuotas !== undefined) payload.total_cuotas = data.totalCuotas
    if (data.cuotaMensual !== undefined) payload.cuota_mensual = data.cuotaMensual
    if (data.montoActualPendiente !== undefined) payload.monto_actual_pendiente = data.montoActualPendiente
    if (data.descripcion !== undefined) payload.descripcion = data.descripcion
    const row = await neon.update<DeudaRow>(TABLE, { id, user_id: userId }, payload)
    if (!row) throw new Error('Deuda not found')
    return mapRow(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await deudasApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    await neon.remove(TABLE, { id, user_id: userId })
  },
}
