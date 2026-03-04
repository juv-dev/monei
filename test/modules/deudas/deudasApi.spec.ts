import { describe, it, expect, beforeEach } from 'vitest'
import { deudasApi } from '~/modules/deudas/services/api'

describe('should deudasApi', () => {
  const userId = 'jugaz'

  beforeEach(() => {
    localStorage.clear()
  })

  const sampleDeuda = {
    nombrePersona: 'María García',
    totalDeuda: 5000,
    tasaInteres: 2.5,
    cuotasPagadas: 3,
    montoActualPendiente: 3500,
    descripcion: 'Préstamo personal',
  }

  it('should return empty array when localStorage is empty', async () => {
    const result = await deudasApi.getAll(userId)
    expect(result).toEqual([])
  })

  it('should create a new deuda with all fields', async () => {
    const created = await deudasApi.create(userId, sampleDeuda)

    expect(created.id).toBeDefined()
    expect(created.nombrePersona).toBe('María García')
    expect(created.totalDeuda).toBe(5000)
    expect(created.tasaInteres).toBe(2.5)
    expect(created.cuotasPagadas).toBe(3)
    expect(created.montoActualPendiente).toBe(3500)
    expect(created.descripcion).toBe('Préstamo personal')
    expect(created.userId).toBe(userId)
    expect(created.createdAt).toBeDefined()
  })

  it('should retrieve all created deudas', async () => {
    await deudasApi.create(userId, sampleDeuda)
    await deudasApi.create(userId, {
      ...sampleDeuda,
      nombrePersona: 'Carlos López',
    })

    const all = await deudasApi.getAll(userId)
    expect(all).toHaveLength(2)
  })

  it('should remove deuda by id', async () => {
    const item = await deudasApi.create(userId, sampleDeuda)

    await deudasApi.remove(userId, item.id)

    const all = await deudasApi.getAll(userId)
    expect(all).toHaveLength(0)
  })

  it('should isolate data between users', async () => {
    await deudasApi.create('jugaz', sampleDeuda)
    await deudasApi.create('fio', { ...sampleDeuda, nombrePersona: 'Otro' })

    const jugazData = await deudasApi.getAll('jugaz')
    const fioData = await deudasApi.getAll('fio')

    expect(jugazData).toHaveLength(1)
    expect(fioData).toHaveLength(1)
  })

  it('should generate unique ids per deuda', async () => {
    const a = await deudasApi.create(userId, sampleDeuda)
    const b = await deudasApi.create(userId, sampleDeuda)
    expect(a.id).not.toBe(b.id)
  })

  it('should handle cuotasPagadas = 0 (optional field)', async () => {
    const created = await deudasApi.create(userId, {
      ...sampleDeuda,
      cuotasPagadas: 0,
    })
    expect(created.cuotasPagadas).toBe(0)
  })

  it('should update a deuda by id', async () => {
    const created = await deudasApi.create(userId, sampleDeuda)
    const updated = await deudasApi.update(userId, created.id, {
      nombrePersona: 'Nuevo Nombre',
      montoActualPendiente: 2000,
    })

    expect(updated.nombrePersona).toBe('Nuevo Nombre')
    expect(updated.montoActualPendiente).toBe(2000)
    expect(updated.totalDeuda).toBe(5000)
  })

  it('should throw when updating non-existent deuda', async () => {
    await expect(deudasApi.update(userId, 'fake-id', { nombrePersona: 'X' })).rejects.toThrow(
      'Deuda not found',
    )
  })

  it('should persist update in localStorage', async () => {
    const created = await deudasApi.create(userId, sampleDeuda)
    await deudasApi.update(userId, created.id, { totalDeuda: 9999 })

    const all = await deudasApi.getAll(userId)
    expect(all[0].totalDeuda).toBe(9999)
  })
})
