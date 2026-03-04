import { describe, it, expect, beforeEach } from 'vitest'
import { presupuestoApi } from '~/modules/presupuesto/services/api'

describe('should presupuestoApi', () => {
  const userId = 'jugaz'
  const userId2 = 'fio'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should return empty array when localStorage is empty', async () => {
    const result = await presupuestoApi.getAll(userId)
    expect(result).toEqual([])
  })

  it('should create a new gasto and persist it', async () => {
    const created = await presupuestoApi.create(userId, {
      monto: 300,
      descripcion: 'Alimentos',
      categoria: 'Alimentación',
    })

    expect(created.id).toBeDefined()
    expect(created.monto).toBe(300)
    expect(created.descripcion).toBe('Alimentos')
    expect(created.categoria).toBe('Alimentación')
    expect(created.userId).toBe(userId)
    expect(created.createdAt).toBeDefined()
  })

  it('should retrieve all created gastos', async () => {
    await presupuestoApi.create(userId, { monto: 100, descripcion: 'Gas', categoria: 'Casa' })
    await presupuestoApi.create(userId, { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const all = await presupuestoApi.getAll(userId)

    expect(all).toHaveLength(2)
  })

  it('should remove gasto by id', async () => {
    const item = await presupuestoApi.create(userId, {
      monto: 500,
      descripcion: 'Renta',
      categoria: 'Casa',
    })

    await presupuestoApi.remove(userId, item.id)

    const all = await presupuestoApi.getAll(userId)
    expect(all).toHaveLength(0)
  })

  it('should keep other items when removing one', async () => {
    const a = await presupuestoApi.create(userId, {
      monto: 100,
      descripcion: 'A',
      categoria: 'General',
    })
    await presupuestoApi.create(userId, { monto: 200, descripcion: 'B', categoria: 'General' })

    await presupuestoApi.remove(userId, a.id)

    const all = await presupuestoApi.getAll(userId)
    expect(all).toHaveLength(1)
    expect(all[0].descripcion).toBe('B')
  })

  it('should isolate data between users', async () => {
    await presupuestoApi.create(userId, {
      monto: 100,
      descripcion: 'Gasto user1',
      categoria: 'General',
    })
    await presupuestoApi.create(userId2, {
      monto: 200,
      descripcion: 'Gasto user2',
      categoria: 'General',
    })

    const user1Data = await presupuestoApi.getAll(userId)
    const user2Data = await presupuestoApi.getAll(userId2)

    expect(user1Data).toHaveLength(1)
    expect(user2Data).toHaveLength(1)
  })

  it('should generate unique ids', async () => {
    const a = await presupuestoApi.create(userId, {
      monto: 10,
      descripcion: 'X',
      categoria: 'General',
    })
    const b = await presupuestoApi.create(userId, {
      monto: 20,
      descripcion: 'Y',
      categoria: 'General',
    })
    expect(a.id).not.toBe(b.id)
  })

  it('should update a gasto by id', async () => {
    const created = await presupuestoApi.create(userId, {
      monto: 100,
      descripcion: 'Original',
      categoria: 'Casa',
    })
    const updated = await presupuestoApi.update(userId, created.id, {
      monto: 200,
      descripcion: 'Updated',
      categoria: 'Trabajo',
    })

    expect(updated.monto).toBe(200)
    expect(updated.descripcion).toBe('Updated')
    expect(updated.categoria).toBe('Trabajo')
  })

  it('should throw when updating non-existent gasto', async () => {
    await expect(
      presupuestoApi.update(userId, 'fake-id', { monto: 500 }),
    ).rejects.toThrow('Gasto not found')
  })

  it('should persist update in localStorage', async () => {
    const created = await presupuestoApi.create(userId, {
      monto: 50,
      descripcion: 'A',
      categoria: 'General',
    })
    await presupuestoApi.update(userId, created.id, { categoria: 'Salud' })

    const all = await presupuestoApi.getAll(userId)
    expect(all[0].categoria).toBe('Salud')
  })
})
