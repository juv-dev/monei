import { neon } from '~/config/neon'
import type { TarjetaCredito, NuevaTarjeta } from '../types'

const DEMO_USER_ID = 'demo'
const TABLE = 'tarjetas_credito'
const storageKey = (userId: string) => `finance_${userId}_tarjetas`

interface TarjetaRow {
  id: string
  user_id: string
  linea_total: number | string
  monto_deuda_actual: number | string
  pago_minimo: number | string | null
  saldo_total: number | string | null
  linea_total_usd: number | string | null
  monto_deuda_actual_usd: number | string | null
  pago_minimo_usd: number | string | null
  saldo_total_usd: number | string | null
  descripcion: string | null
  created_at: string
}

function mapRow(row: TarjetaRow): TarjetaCredito {
  return {
    id: String(row.id),
    lineaTotal: Number(row.linea_total ?? 0),
    montoDeudaActual: Number(row.monto_deuda_actual ?? 0),
    pagoMinimo: row.pago_minimo != null ? Number(row.pago_minimo) : undefined,
    saldoTotal: row.saldo_total != null ? Number(row.saldo_total) : undefined,
    lineaTotalUsd: row.linea_total_usd != null ? Number(row.linea_total_usd) : undefined,
    montoDeudaActualUsd: row.monto_deuda_actual_usd != null ? Number(row.monto_deuda_actual_usd) : undefined,
    pagoMinimoUsd: row.pago_minimo_usd != null ? Number(row.pago_minimo_usd) : undefined,
    saldoTotalUsd: row.saldo_total_usd != null ? Number(row.saldo_total_usd) : undefined,
    descripcion: String(row.descripcion ?? ''),
    userId: String(row.user_id ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export const tarjetasApi = {
  async getAll(userId: string): Promise<TarjetaCredito[]> {
    if (userId === DEMO_USER_ID) {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as TarjetaCredito[]) : []
    }
    const rows = await neon.select<TarjetaRow>(TABLE, {
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
    })
    return rows.map(mapRow)
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
    const payload: Record<string, unknown> = {
      user_id: userId,
      linea_total: data.lineaTotal,
      monto_deuda_actual: data.montoDeudaActual,
      descripcion: data.descripcion,
    }
    if (data.pagoMinimo !== undefined) payload.pago_minimo = data.pagoMinimo
    if (data.saldoTotal !== undefined) payload.saldo_total = data.saldoTotal
    if (data.lineaTotalUsd !== undefined) payload.linea_total_usd = data.lineaTotalUsd
    if (data.montoDeudaActualUsd !== undefined) payload.monto_deuda_actual_usd = data.montoDeudaActualUsd
    if (data.pagoMinimoUsd !== undefined) payload.pago_minimo_usd = data.pagoMinimoUsd
    if (data.saldoTotalUsd !== undefined) payload.saldo_total_usd = data.saldoTotalUsd
    const row = await neon.insert<TarjetaRow>(TABLE, payload)
    return mapRow(row)
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
    const payload: Record<string, unknown> = {}
    if (data.lineaTotal !== undefined) payload.linea_total = data.lineaTotal
    if (data.montoDeudaActual !== undefined) payload.monto_deuda_actual = data.montoDeudaActual
    if (data.pagoMinimo !== undefined) payload.pago_minimo = data.pagoMinimo
    if (data.saldoTotal !== undefined) payload.saldo_total = data.saldoTotal
    if (data.lineaTotalUsd !== undefined) payload.linea_total_usd = data.lineaTotalUsd
    if (data.montoDeudaActualUsd !== undefined) payload.monto_deuda_actual_usd = data.montoDeudaActualUsd
    if (data.pagoMinimoUsd !== undefined) payload.pago_minimo_usd = data.pagoMinimoUsd
    if (data.saldoTotalUsd !== undefined) payload.saldo_total_usd = data.saldoTotalUsd
    if (data.descripcion !== undefined) payload.descripcion = data.descripcion
    const row = await neon.update<TarjetaRow>(TABLE, { id, user_id: userId }, payload)
    if (!row) throw new Error('Tarjeta not found')
    return mapRow(row)
  },

  async remove(userId: string, id: string): Promise<void> {
    if (userId === DEMO_USER_ID) {
      const all = await tarjetasApi.getAll(userId)
      const filtered = all.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
      return
    }
    await neon.remove(TABLE, { id, user_id: userId })
  },
}
