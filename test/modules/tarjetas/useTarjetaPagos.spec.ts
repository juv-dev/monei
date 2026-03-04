import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useTarjetaPagos, PAGOS_QUERY_KEY } from '~/modules/tarjetas/composables/useTarjetaPagos'
import { pagosApi } from '~/modules/tarjetas/services/pagosApi'
import { tarjetasApi } from '~/modules/tarjetas/services/api'

describe('should useTarjetaPagos', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const samplePago = {
    tarjetaId: 'tarjeta-1',
    monto: 500,
    fecha: '2026-02-27',
  }

  function setupWithUser(username = 'jugaz') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useTarjetaPagos()
    })
  }

  it('should return empty pagos initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.pagos.value).toEqual([])
    unmount()
  })

  it('should load existing pagos from localStorage', async () => {
    await pagosApi.create('jugaz', samplePago)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.pagos.value).toHaveLength(1)
    expect(result.pagos.value[0].monto).toBe(500)
    unmount()
  })

  it('should add pago via mutation', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // Create a tarjeta first so addPago can update it
    await tarjetasApi.create('jugaz', {
      lineaTotal: 10000,
      montoDeudaActual: 3500,
      descripcion: 'Visa',
    })
    const tarjetas = await tarjetasApi.getAll('jugaz')
    const tarjetaId = tarjetas[0].id

    result.addPago({ tarjetaId, monto: 500, fecha: '2026-02-27' })
    await flushPromises()

    const stored = await pagosApi.getAll('jugaz')
    expect(stored).toHaveLength(1)
    expect(stored[0].monto).toBe(500)
    unmount()
  })

  it('should reduce tarjeta montoDeudaActual after addPago', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tarjeta = await tarjetasApi.create('jugaz', {
      lineaTotal: 10000,
      montoDeudaActual: 3500,
      saldoTotal: 5000,
      descripcion: 'Visa',
    })

    result.addPago({ tarjetaId: tarjeta.id, monto: 1000, fecha: '2026-02-27' })
    await flushPromises()

    const updated = await tarjetasApi.getAll('jugaz')
    expect(updated[0].montoDeudaActual).toBe(2500)
    expect(updated[0].saldoTotal).toBe(4000)
    unmount()
  })

  it('should clamp montoDeudaActual to zero when paying more than owed', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tarjeta = await tarjetasApi.create('jugaz', {
      lineaTotal: 10000,
      montoDeudaActual: 500,
      saldoTotal: 500,
      descripcion: 'Visa',
    })

    result.addPago({ tarjetaId: tarjeta.id, monto: 1000, fecha: '2026-02-27' })
    await flushPromises()

    const updated = await tarjetasApi.getAll('jugaz')
    expect(updated[0].montoDeudaActual).toBe(0)
    expect(updated[0].saldoTotal).toBe(0)
    unmount()
  })

  it('should remove pago via mutation', async () => {
    const pago = await pagosApi.create('jugaz', samplePago)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.removePago(pago.id)
    await flushPromises()

    const stored = await pagosApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
    unmount()
  })

  it('should return pagos sorted by createdAt descending via pagosDeTarjeta', async () => {
    // Manually insert pagos with explicit createdAt to guarantee order
    const all = [
      {
        id: 'p1',
        tarjetaId: 'tarjeta-1',
        monto: 100,
        fecha: '2026-02-25',
        userId: 'jugaz',
        createdAt: '2026-02-25T10:00:00.000Z',
      },
      {
        id: 'p2',
        tarjetaId: 'tarjeta-1',
        monto: 200,
        fecha: '2026-02-27',
        userId: 'jugaz',
        createdAt: '2026-02-27T10:00:00.000Z',
      },
    ]
    localStorage.setItem('finance_jugaz_tarjeta_pagos', JSON.stringify(all))

    const { result, unmount } = setupWithUser()
    await flushPromises()

    const pagos = result.pagosDeTarjeta('tarjeta-1')
    expect(pagos).toHaveLength(2)
    // Most recent first (higher createdAt)
    expect(pagos[0].monto).toBe(200)
    expect(pagos[1].monto).toBe(100)
    unmount()
  })

  it('should filter pagosDeTarjeta by tarjetaId', async () => {
    await pagosApi.create('jugaz', samplePago)
    await pagosApi.create('jugaz', { ...samplePago, tarjetaId: 'tarjeta-2', monto: 300 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.pagosDeTarjeta('tarjeta-1')).toHaveLength(1)
    expect(result.pagosDeTarjeta('tarjeta-2')).toHaveLength(1)
    expect(result.pagosDeTarjeta('non-existent')).toHaveLength(0)
    unmount()
  })

  it('should expose correct query key', () => {
    expect(PAGOS_QUERY_KEY('fio')).toEqual(['finance', 'fio', 'tarjeta_pagos'])
  })

  it('should expose isAddingPago as false initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.isAddingPago.value).toBe(false)
    unmount()
  })

  it('should handle tarjeta without saldoTotal on addPago', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tarjeta = await tarjetasApi.create('jugaz', {
      lineaTotal: 10000,
      montoDeudaActual: 3500,
      descripcion: 'Visa sin saldo',
    })

    result.addPago({ tarjetaId: tarjeta.id, monto: 500, fecha: '2026-02-27' })
    await flushPromises()

    const updated = await tarjetasApi.getAll('jugaz')
    expect(updated[0].montoDeudaActual).toBe(3000)
    // saldoTotal should remain undefined
    expect(updated[0].saldoTotal).toBeUndefined()
    unmount()
  })

  it('should skip tarjeta update when tarjetaId does not match any tarjeta', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // Add a pago with a non-existent tarjetaId — tarjeta.find returns undefined
    result.addPago({ tarjetaId: 'non-existent-id', monto: 500, fecha: '2026-02-27' })
    await flushPromises()

    // Pago should still be created
    const stored = await pagosApi.getAll('jugaz')
    expect(stored).toHaveLength(1)
    expect(stored[0].tarjetaId).toBe('non-existent-id')
    unmount()
  })

  it('should be disabled and return empty data when no user is authenticated', async () => {
    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: null, isAuthenticated: false })
      return useTarjetaPagos()
    })
    await flushPromises()

    expect(result.pagos.value).toEqual([])
    unmount()
  })
})
