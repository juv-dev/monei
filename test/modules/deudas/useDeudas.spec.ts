import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import {
  useDeudas,
  DEUDAS_QUERY_KEY,
} from '~/modules/deudas/composables/useDeudas'
import { deudasApi } from '~/modules/deudas/services/api'

describe('should useDeudas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const sampleDeuda = {
    nombrePersona: 'Ana Torres',
    totalDeuda: 8000,
    tasaInteres: 3,
    cuotasPagadas: 2,
    montoActualPendiente: 6000,
    descripcion: 'Préstamo auto',
  }

  function setupWithUser(username = 'jugaz') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useDeudas()
    })
  }

  it('should return empty deudas and zero totals initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.deudas.value).toEqual([])
    expect(result.totalDeudas.value).toBe(0)
    expect(result.totalPendiente.value).toBe(0)
    unmount()
  })

  it('should load existing deudas from localStorage', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.deudas.value).toHaveLength(1)
    expect(result.deudas.value[0].nombrePersona).toBe('Ana Torres')
    unmount()
  })

  it('should calculate totalDeudas as sum of all totalDeuda', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 5000 })
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 3000 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.totalDeudas.value).toBe(8000)
    unmount()
  })

  it('should calculate totalPendiente as sum of all montoActualPendiente', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, montoActualPendiente: 4000 })
    await deudasApi.create('jugaz', { ...sampleDeuda, montoActualPendiente: 2000 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.totalPendiente.value).toBe(6000)
    unmount()
  })

  it('should add deuda via mutation', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.addDeuda(sampleDeuda)
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored).toHaveLength(1)
    expect(stored[0].nombrePersona).toBe('Ana Torres')
    unmount()
  })

  it('should remove deuda via mutation', async () => {
    const item = await deudasApi.create('jugaz', sampleDeuda)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.removeDeuda(item.id)
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
    unmount()
  })

  it('should expose correct query key', () => {
    expect(DEUDAS_QUERY_KEY('jugaz')).toEqual(['finance', 'jugaz', 'deudas'])
  })

  it('should isolate deudas between users', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Para Jugaz' })
    await deudasApi.create('fio', { ...sampleDeuda, nombrePersona: 'Para Fio' })

    const { result, unmount } = setupWithUser('fio')
    await flushPromises()

    expect(result.deudas.value).toHaveLength(1)
    expect(result.deudas.value[0].nombrePersona).toBe('Para Fio')
    unmount()
  })

  it('should expose isAdding, isRemoving, isError as false initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.isAdding.value).toBe(false)
    expect(result.isRemoving.value).toBe(false)
    expect(result.isError.value).toBe(false)
    unmount()
  })

  it('should handle deuda with cuotasPagadas = 0', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, cuotasPagadas: 0 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.deudas.value[0].cuotasPagadas).toBe(0)
    unmount()
  })

  it('should be disabled and return empty data when no user is authenticated', async () => {
    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: null, isAuthenticated: false })
      return useDeudas()
    })
    await flushPromises()

    expect(result.deudas.value).toEqual([])
    expect(result.totalDeudas.value).toBe(0)
    expect(result.totalPendiente.value).toBe(0)
    unmount()
  })
})
