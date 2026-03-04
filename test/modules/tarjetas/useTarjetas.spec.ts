import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import {
  useTarjetas,
  TARJETAS_QUERY_KEY,
} from '~/modules/tarjetas/composables/useTarjetas'
import { tarjetasApi } from '~/modules/tarjetas/services/api'

describe('should useTarjetas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const sampleTarjeta = {
    lineaTotal: 10000,
    montoDeudaActual: 4500,
    descripcion: 'Visa BCP',
  }

  function setupWithUser(username = 'jugaz') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useTarjetas()
    })
  }

  it('should return empty tarjetas and zero totals initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.tarjetas.value).toEqual([])
    expect(result.totalTarjetas.value).toBe(0)
    expect(result.lineaTotalCombinada.value).toBe(0)
    unmount()
  })

  it('should load existing tarjetas from localStorage', async () => {
    await tarjetasApi.create('jugaz', sampleTarjeta)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.tarjetas.value).toHaveLength(1)
    expect(result.tarjetas.value[0].descripcion).toBe('Visa BCP')
    unmount()
  })

  it('should calculate totalTarjetas as sum of montoDeudaActual', async () => {
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, montoDeudaActual: 3000 })
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, montoDeudaActual: 2000 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.totalTarjetas.value).toBe(5000)
    unmount()
  })

  it('should calculate lineaTotalCombinada as sum of lineaTotal', async () => {
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, lineaTotal: 8000 })
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, lineaTotal: 5000 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.lineaTotalCombinada.value).toBe(13000)
    unmount()
  })

  it('should add tarjeta via mutation', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.addTarjeta(sampleTarjeta)
    await flushPromises()

    const stored = await tarjetasApi.getAll('jugaz')
    expect(stored).toHaveLength(1)
    expect(stored[0].descripcion).toBe('Visa BCP')
    unmount()
  })

  it('should remove tarjeta via mutation', async () => {
    const item = await tarjetasApi.create('jugaz', sampleTarjeta)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.removeTarjeta(item.id)
    await flushPromises()

    const stored = await tarjetasApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
    unmount()
  })

  it('should expose correct query key', () => {
    expect(TARJETAS_QUERY_KEY('fio')).toEqual(['finance', 'fio', 'tarjetas'])
  })

  it('should isolate data between users', async () => {
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, descripcion: 'Jugaz card' })
    await tarjetasApi.create('fio', { ...sampleTarjeta, descripcion: 'Fio card' })

    const { result, unmount } = setupWithUser('fio')
    await flushPromises()

    expect(result.tarjetas.value).toHaveLength(1)
    expect(result.tarjetas.value[0].descripcion).toBe('Fio card')
    unmount()
  })

  it('should handle montoDeudaActual = 0', async () => {
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, montoDeudaActual: 0 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.totalTarjetas.value).toBe(0)
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

  it('should be disabled and return empty data when no user is authenticated', async () => {
    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: null, isAuthenticated: false })
      return useTarjetas()
    })
    await flushPromises()

    expect(result.tarjetas.value).toEqual([])
    expect(result.totalTarjetas.value).toBe(0)
    expect(result.lineaTotalCombinada.value).toBe(0)
    unmount()
  })
})
