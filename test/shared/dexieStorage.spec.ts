import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/config/db', () => ({
  db: {
    cache: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '~/config/db'
import { dexieStorage } from '~/shared/services/dexieStorage'

describe('should dexieStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the stored value when key exists', async () => {
    vi.mocked(db.cache.get).mockResolvedValue({ key: 'myKey', value: 'myValue', updatedAt: Date.now() })
    const result = await dexieStorage.getItem('myKey')
    expect(result).toBe('myValue')
    expect(db.cache.get).toHaveBeenCalledWith('myKey')
  })

  it('should return null when key does not exist', async () => {
    vi.mocked(db.cache.get).mockResolvedValue(undefined)
    const result = await dexieStorage.getItem('missing')
    expect(result).toBeNull()
  })

  it('should return null when entry has no value', async () => {
    vi.mocked(db.cache.get).mockResolvedValue(undefined)
    const result = await dexieStorage.getItem('empty')
    expect(result).toBeNull()
  })

  it('should call put with key, value and updatedAt when setItem is called', async () => {
    vi.mocked(db.cache.put).mockResolvedValue(undefined as unknown as string)
    await dexieStorage.setItem('k1', 'v1')
    expect(db.cache.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'k1', value: 'v1', updatedAt: expect.any(Number) }),
    )
  })

  it('should call delete with the key when removeItem is called', async () => {
    vi.mocked(db.cache.delete).mockResolvedValue(undefined)
    await dexieStorage.removeItem('k1')
    expect(db.cache.delete).toHaveBeenCalledWith('k1')
  })

  it('should store and allow retrieval of different keys independently', async () => {
    vi.mocked(db.cache.get)
      .mockResolvedValueOnce({ key: 'a', value: 'valueA', updatedAt: 1 })
      .mockResolvedValueOnce({ key: 'b', value: 'valueB', updatedAt: 2 })

    const a = await dexieStorage.getItem('a')
    const b = await dexieStorage.getItem('b')

    expect(a).toBe('valueA')
    expect(b).toBe('valueB')
  })
})
