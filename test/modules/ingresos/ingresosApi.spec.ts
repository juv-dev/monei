import { describe, it, expect, beforeEach } from 'vitest'
import { ingresosApi } from '~/modules/ingresos/services/api'

describe('should ingresosApi', () => {
  const userId = 'jugaz'
  const userId2 = 'fio'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should return empty array when no data in localStorage', async () => {
    const result = await ingresosApi.getAll(userId)
    expect(result).toEqual([])
  })

  it('should create a new ingreso and persist it', async () => {
    const created = await ingresosApi.create(userId, {
      monto: 1500,
      descripcion: 'Salario',
    })

    expect(created.id).toBeDefined()
    expect(created.monto).toBe(1500)
    expect(created.descripcion).toBe('Salario')
    expect(created.userId).toBe(userId)
    expect(created.createdAt).toBeDefined()
  })

  it('should retrieve all created ingresos', async () => {
    await ingresosApi.create(userId, { monto: 1000, descripcion: 'Trabajo' })
    await ingresosApi.create(userId, { monto: 500, descripcion: 'Freelance' })

    const all = await ingresosApi.getAll(userId)

    expect(all).toHaveLength(2)
    expect(all[0].descripcion).toBe('Trabajo')
    expect(all[1].descripcion).toBe('Freelance')
  })

  it('should remove ingreso by id', async () => {
    const item = await ingresosApi.create(userId, { monto: 200, descripcion: 'Bono' })

    await ingresosApi.remove(userId, item.id)

    const all = await ingresosApi.getAll(userId)
    expect(all).toHaveLength(0)
  })

  it('should not affect other items when removing one', async () => {
    const a = await ingresosApi.create(userId, { monto: 100, descripcion: 'A' })
    await ingresosApi.create(userId, { monto: 200, descripcion: 'B' })

    await ingresosApi.remove(userId, a.id)

    const all = await ingresosApi.getAll(userId)
    expect(all).toHaveLength(1)
    expect(all[0].descripcion).toBe('B')
  })

  it('should isolate data between different users', async () => {
    await ingresosApi.create(userId, { monto: 1000, descripcion: 'User1 income' })
    await ingresosApi.create(userId2, { monto: 2000, descripcion: 'User2 income' })

    const user1Data = await ingresosApi.getAll(userId)
    const user2Data = await ingresosApi.getAll(userId2)

    expect(user1Data).toHaveLength(1)
    expect(user2Data).toHaveLength(1)
    expect(user1Data[0].descripcion).toBe('User1 income')
    expect(user2Data[0].descripcion).toBe('User2 income')
  })

  it('should generate unique ids for each ingreso', async () => {
    const a = await ingresosApi.create(userId, { monto: 100, descripcion: 'A' })
    const b = await ingresosApi.create(userId, { monto: 200, descripcion: 'B' })

    expect(a.id).not.toBe(b.id)
  })

  it('should handle remove of non-existent id gracefully', async () => {
    await ingresosApi.create(userId, { monto: 100, descripcion: 'Existing' })

    await ingresosApi.remove(userId, 'non-existent-id')

    const all = await ingresosApi.getAll(userId)
    expect(all).toHaveLength(1)
  })

  it('should update an ingreso by id', async () => {
    const created = await ingresosApi.create(userId, { monto: 1000, descripcion: 'Original' })
    const updated = await ingresosApi.update(userId, created.id, {
      monto: 2000,
      descripcion: 'Updated',
    })

    expect(updated.monto).toBe(2000)
    expect(updated.descripcion).toBe('Updated')
  })

  it('should throw when updating non-existent ingreso', async () => {
    await expect(ingresosApi.update(userId, 'fake-id', { monto: 500 })).rejects.toThrow('Ingreso not found')
  })

  it('should persist update in localStorage', async () => {
    const created = await ingresosApi.create(userId, { monto: 100, descripcion: 'A' })
    await ingresosApi.update(userId, created.id, { descripcion: 'B' })

    const all = await ingresosApi.getAll(userId)
    expect(all[0].descripcion).toBe('B')
  })
})
