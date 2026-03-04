import { describe, it, expect, beforeEach } from 'vitest'
import { tarjetasApi } from '~/modules/tarjetas/services/api'

describe('should tarjetasApi', () => {
  const userId = 'jugaz'

  beforeEach(() => {
    localStorage.clear()
  })

  const sampleTarjeta = {
    lineaTotal: 10000,
    montoDeudaActual: 3500,
    descripcion: 'Visa BCP',
  }

  it('should return empty array when localStorage is empty', async () => {
    const result = await tarjetasApi.getAll(userId)
    expect(result).toEqual([])
  })

  it('should create a new tarjeta and persist it', async () => {
    const created = await tarjetasApi.create(userId, sampleTarjeta)

    expect(created.id).toBeDefined()
    expect(created.lineaTotal).toBe(10000)
    expect(created.montoDeudaActual).toBe(3500)
    expect(created.descripcion).toBe('Visa BCP')
    expect(created.userId).toBe(userId)
    expect(created.createdAt).toBeDefined()
  })

  it('should retrieve all created tarjetas', async () => {
    await tarjetasApi.create(userId, sampleTarjeta)
    await tarjetasApi.create(userId, { ...sampleTarjeta, descripcion: 'MasterCard' })

    const all = await tarjetasApi.getAll(userId)
    expect(all).toHaveLength(2)
  })

  it('should remove tarjeta by id', async () => {
    const item = await tarjetasApi.create(userId, sampleTarjeta)

    await tarjetasApi.remove(userId, item.id)

    const all = await tarjetasApi.getAll(userId)
    expect(all).toHaveLength(0)
  })

  it('should isolate data between users', async () => {
    await tarjetasApi.create('jugaz', sampleTarjeta)
    await tarjetasApi.create('fio', { ...sampleTarjeta, descripcion: 'Amex' })

    const jugazData = await tarjetasApi.getAll('jugaz')
    const fioData = await tarjetasApi.getAll('fio')

    expect(jugazData).toHaveLength(1)
    expect(fioData).toHaveLength(1)
  })

  it('should handle montoDeudaActual = 0', async () => {
    const created = await tarjetasApi.create(userId, {
      ...sampleTarjeta,
      montoDeudaActual: 0,
    })
    expect(created.montoDeudaActual).toBe(0)
  })

  it('should generate unique ids per tarjeta', async () => {
    const a = await tarjetasApi.create(userId, sampleTarjeta)
    const b = await tarjetasApi.create(userId, sampleTarjeta)
    expect(a.id).not.toBe(b.id)
  })

  // ─── Update ─────────────────────────────────────────────────────────
  it('should update a tarjeta by id', async () => {
    const created = await tarjetasApi.create(userId, sampleTarjeta)
    const updated = await tarjetasApi.update(userId, created.id, { descripcion: 'Visa Editada' })

    expect(updated.descripcion).toBe('Visa Editada')
    expect(updated.lineaTotal).toBe(10000) // unchanged
  })

  it('should throw when updating non-existent tarjeta', async () => {
    await expect(
      tarjetasApi.update(userId, 'non-existent-id', { descripcion: 'X' }),
    ).rejects.toThrow('Tarjeta not found')
  })

  it('should persist tarjeta update in localStorage', async () => {
    const created = await tarjetasApi.create(userId, sampleTarjeta)
    await tarjetasApi.update(userId, created.id, { montoDeudaActual: 1000 })

    const all = await tarjetasApi.getAll(userId)
    expect(all[0].montoDeudaActual).toBe(1000)
  })
})
