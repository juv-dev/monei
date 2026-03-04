import type { TarjetaPago, NuevoTarjetaPago } from '../types'

const storageKey = (userId: string) => `finance_${userId}_tarjeta_pagos`

export const pagosApi = {
  async getAll(userId: string): Promise<TarjetaPago[]> {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as TarjetaPago[]) : []
  },

  async getByTarjeta(userId: string, tarjetaId: string): Promise<TarjetaPago[]> {
    const all = await pagosApi.getAll(userId)
    return all.filter((p) => p.tarjetaId === tarjetaId)
  },

  async create(userId: string, data: NuevoTarjetaPago): Promise<TarjetaPago> {
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
  },

  async remove(userId: string, pagoId: string): Promise<void> {
    const all = await pagosApi.getAll(userId)
    const filtered = all.filter((p) => p.id !== pagoId)
    localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
  },
}
