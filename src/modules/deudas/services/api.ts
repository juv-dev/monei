import type { Deuda, NuevaDeuda } from '../types'

const storageKey = (userId: string) => `finance_${userId}_deudas`

export const deudasApi = {
  async getAll(userId: string): Promise<Deuda[]> {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as Deuda[]) : []
  },

  async create(userId: string, data: NuevaDeuda): Promise<Deuda> {
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
  },

  async update(userId: string, id: string, data: Partial<NuevaDeuda>): Promise<Deuda> {
    const all = await deudasApi.getAll(userId)
    const idx = all.findIndex((item) => item.id === id)
    if (idx === -1) throw new Error('Deuda not found')
    all[idx] = { ...all[idx]!, ...data }
    localStorage.setItem(storageKey(userId), JSON.stringify(all))
    return all[idx]!
  },

  async remove(userId: string, id: string): Promise<void> {
    const all = await deudasApi.getAll(userId)
    const filtered = all.filter((item) => item.id !== id)
    localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
  },
}
