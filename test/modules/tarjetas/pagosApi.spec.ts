import { describe, it, expect, beforeEach } from 'vitest'
import { pagosApi } from '~/modules/tarjetas/services/pagosApi'

describe('should pagosApi', () => {
  const userId = 'jugaz'

  beforeEach(() => {
    localStorage.clear()
  })

  const samplePago = {
    tarjetaId: 'tarjeta-1',
    monto: 500,
    fecha: '2026-02-27',
  }

  it('should return empty array when localStorage is empty', async () => {
    const result = await pagosApi.getAll(userId)
    expect(result).toEqual([])
  })

  it('should create a new pago and persist it', async () => {
    const created = await pagosApi.create(userId, samplePago)

    expect(created.id).toBeDefined()
    expect(created.tarjetaId).toBe('tarjeta-1')
    expect(created.monto).toBe(500)
    expect(created.fecha).toBe('2026-02-27')
    expect(created.userId).toBe(userId)
    expect(created.createdAt).toBeDefined()
  })

  it('should retrieve all created pagos', async () => {
    await pagosApi.create(userId, samplePago)
    await pagosApi.create(userId, { ...samplePago, monto: 300 })

    const all = await pagosApi.getAll(userId)
    expect(all).toHaveLength(2)
  })

  it('should filter pagos by tarjetaId', async () => {
    await pagosApi.create(userId, samplePago)
    await pagosApi.create(userId, { ...samplePago, tarjetaId: 'tarjeta-2', monto: 200 })

    const filtered = await pagosApi.getByTarjeta(userId, 'tarjeta-1')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].tarjetaId).toBe('tarjeta-1')
  })

  it('should return empty array when filtering by non-existent tarjetaId', async () => {
    await pagosApi.create(userId, samplePago)

    const filtered = await pagosApi.getByTarjeta(userId, 'non-existent')
    expect(filtered).toEqual([])
  })

  it('should remove pago by id', async () => {
    const item = await pagosApi.create(userId, samplePago)

    await pagosApi.remove(userId, item.id)

    const all = await pagosApi.getAll(userId)
    expect(all).toHaveLength(0)
  })

  it('should isolate data between users', async () => {
    await pagosApi.create('jugaz', samplePago)
    await pagosApi.create('fio', { ...samplePago, monto: 100 })

    const jugazData = await pagosApi.getAll('jugaz')
    const fioData = await pagosApi.getAll('fio')

    expect(jugazData).toHaveLength(1)
    expect(fioData).toHaveLength(1)
  })

  it('should generate unique ids per pago', async () => {
    const a = await pagosApi.create(userId, samplePago)
    const b = await pagosApi.create(userId, samplePago)
    expect(a.id).not.toBe(b.id)
  })

  it('should not affect other pagos when removing one', async () => {
    const first = await pagosApi.create(userId, samplePago)
    await pagosApi.create(userId, { ...samplePago, monto: 200 })

    await pagosApi.remove(userId, first.id)

    const remaining = await pagosApi.getAll(userId)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].monto).toBe(200)
  })
})
