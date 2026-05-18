import { db } from '~/config/db'

export const dexieStorage = {
  async getItem(key: string): Promise<string | null> {
    const entry = await db.cache.get(key)
    return entry?.value ?? null
  },

  async setItem(key: string, value: string): Promise<void> {
    await db.cache.put({ key, value, updatedAt: Date.now() })
  },

  async removeItem(key: string): Promise<void> {
    await db.cache.delete(key)
  },
}
