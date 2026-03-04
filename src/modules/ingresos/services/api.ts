import type { Ingreso, NuevoIngreso } from '../types'

const storageKey = (userId: string) => `finance_${userId}_ingresos`

export const ingresosApi = {
  async getAll(userId: string): Promise<Ingreso[]> {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as Ingreso[]) : []
  },

  async create(userId: string, data: NuevoIngreso): Promise<Ingreso> {
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
  },

  async update(userId: string, id: string, data: Partial<NuevoIngreso>): Promise<Ingreso> {
    const all = await ingresosApi.getAll(userId)
    const idx = all.findIndex((item) => item.id === id)
    if (idx === -1) throw new Error('Ingreso not found')
    all[idx] = { ...all[idx], ...data }
    localStorage.setItem(storageKey(userId), JSON.stringify(all))
    return all[idx]
  },

  async remove(userId: string, id: string): Promise<void> {
    const all = await ingresosApi.getAll(userId)
    const filtered = all.filter((item) => item.id !== id)
    localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
  },
}
