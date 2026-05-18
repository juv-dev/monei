import { neon } from '~/config/neon'
import type { TarjetaPago, NuevoTarjetaPago } from '../types'

const DEMO_USER_ID = 'demo'
const TABLE = 'tarjeta_pagos'
const storageKey = (userId: string) => `finance_${userId}_tarjeta_pagos`

interface PagoRow {
  id: string
  user_id: string
  tarjeta_id: string
  monto: number | string
  fecha: string
  created_at: string
}

function mapRow(row: PagoRow): TarjetaPago {
  return {
    id: String(row.id),
    tarjetaId: String(row.tarjeta_id ?? ''),
    monto: Number(row.monto ?? 0),
    fecha: String(row.fecha ?? ''),
    userId: String(row.user_id ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const pagosApi = {
  async getAll(userId: string): Promise<TarjetaPago[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as TarjetaPago[]) : []
    }
    const rows = await neon.select<PagoRow>(TABLE, {
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
    })
    return rows.map(mapRow)
  },

  async getByTarjeta(userId: string, tarjetaId: string): Promise<TarjetaPago[]> {
    if (userId === DEMO_USER_ID) {
      const all = await pagosApi.getAll(userId)
      return all.filter((p) => p.tarjetaId === tarjetaId)
    }
    const rows = await neon.select<PagoRow>(TABLE, {
      user_id: `eq.${userId}`,
      tarjeta_id: `eq.${tarjetaId}`,
      order: 'created_at.desc',
    })
    return rows.map(mapRow)
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
    const row = await neon.insert<PagoRow>(TABLE, {
      user_id: userId,
      tarjeta_id: data.tarjetaId,
      monto: data.monto,
      fecha: data.fecha,
    })
    return mapRow(row)
  },

  async remove(userId: string, pagoId: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await pagosApi.getAll(userId)
      const filtered = all.filter((p) => p.id !== pagoId)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    await neon.remove(TABLE, { id: pagoId, user_id: userId })
  },
}
