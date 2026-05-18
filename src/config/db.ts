import Dexie, { type Table } from 'dexie'

export interface CacheEntry {
  key: string
  value: string
  updatedAt: number
}

export interface QueuedMutation {
  id?: number
  scope: string
  payload: string
  createdAt: number
  retryCount: number
}

export class MoneiDatabase extends Dexie {
  cache!: Table<CacheEntry, string>
  mutationsQueue!: Table<QueuedMutation, number>

  constructor() {
    super('monei')
    this.version(1).stores({
      cache: 'key, updatedAt',
      mutationsQueue: '++id, scope, createdAt',
    })
  }
}

export const db = new MoneiDatabase()
