import type { GastoPresupuesto, NuevoGasto } from '../types'

const storageKey = (userId: string) => `finance_${userId}_presupuesto`

export const presupuestoApi = {
  async getAll(userId: string): Promise<GastoPresupuesto[]> {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as GastoPresupuesto[]) : []
  },

  async create(userId: string, data: NuevoGasto): Promise<GastoPresupuesto> {
    const all = await presupuestoApi.getAll(userId)
    const newItem: GastoPresupuesto = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      ...data,
    }
    all.push(newItem)
    localStorage.setItem(storageKey(userId), JSON.stringify(all))
    return newItem
  },

  async update(
    userId: string,
    id: string,
    data: { monto?: number; descripcion?: string; categoria?: string },
  ): Promise<GastoPresupuesto> {
    const all = await presupuestoApi.getAll(userId)
    const idx = all.findIndex((item) => item.id === id)
    if (idx === -1) throw new Error('Gasto not found')
    all[idx] = { ...all[idx]!, ...data }
    localStorage.setItem(storageKey(userId), JSON.stringify(all))
    return all[idx]!
  },

  async remove(userId: string, id: string): Promise<void> {
    const all = await presupuestoApi.getAll(userId)
    const filtered = all.filter((item) => item.id !== id)
    localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
  },
}
