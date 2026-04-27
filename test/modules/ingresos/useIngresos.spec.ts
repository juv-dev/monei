import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useIngresos, INGRESOS_BASE_KEY } from '~/modules/ingresos/composables/useIngresos'
import { ingresosApi } from '~/modules/ingresos/services/api'

describe('should useIngresos', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function setupWithAuthUser(username = 'jugaz') {
    const { result, queryClient, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useIngresos()
    })
    return { result, queryClient, unmount }
  }

  it('should return empty ingresos and zero total initially', async () => {
    const { result, unmount } = setupWithAuthUser()
    await flushPromises()

    expect(result.ingresos.value).toEqual([])
    expect(result.totalIngresos.value).toBe(0)
    expect(result.isLoading.value).toBe(false)
    unmount()
  })

  it('should load existing ingresos from localStorage', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Bono' })

    const { result, unmount } = setupWithAuthUser('jugaz')
    await flushPromises()

    expect(result.ingresos.value).toHaveLength(2)
    expect(result.totalIngresos.value).toBe(1500)
    unmount()
  })

  it('should calculate totalIngresos as sum of all montos', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'A' })
    await ingresosApi.create('jugaz', { monto: 2000, descripcion: 'B' })
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'C' })

    const { result, unmount } = setupWithAuthUser()
    await flushPromises()

    expect(result.totalIngresos.value).toBe(3500)
    unmount()
  })

  it('should add ingreso via mutation and invalidate query', async () => {
    const { result, unmount } = setupWithAuthUser()
    await flushPromises()

    result.addIngreso({ monto: 1500, descripcion: 'Freelance' })
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored).toHaveLength(1)
    expect(stored[0].descripcion).toBe('Freelance')
    unmount()
  })

  it('should remove ingreso via mutation and invalidate query', async () => {
    const item = await ingresosApi.create('jugaz', {
      monto: 800,
      descripcion: 'Consultoría',
    })

    const { result, unmount } = setupWithAuthUser()
    await flushPromises()

    result.removeIngreso(item.id)
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
    unmount()
  })

  it('should expose correct query key based on userId', () => {
    const key = INGRESOS_BASE_KEY('jugaz')
    expect(key).toEqual(['finance', 'jugaz', 'ingresos'])
  })

  it('should be disabled when no user is authenticated', async () => {
    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: null, isAuthenticated: false })
      return useIngresos()
    })
    await flushPromises()

    // sin usuario no hay datos
    expect(result.ingresos.value).toEqual([])
    expect(result.totalIngresos.value).toBe(0)
    unmount()
  })

  it('should isolate data per userId', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Jugaz income' })
    await ingresosApi.create('fio', { monto: 2000, descripcion: 'Fio income' })

    const { result, unmount } = setupWithAuthUser('fio')
    await flushPromises()

    expect(result.ingresos.value).toHaveLength(1)
    expect(result.ingresos.value[0].descripcion).toBe('Fio income')
    expect(result.totalIngresos.value).toBe(2000)
    unmount()
  })

  it('should expose isAdding as false initially', async () => {
    const { result, unmount } = setupWithAuthUser()
    await flushPromises()
    expect(result.isAdding.value).toBe(false)
    unmount()
  })

  it('should expose isRemoving as false initially', async () => {
    const { result, unmount } = setupWithAuthUser()
    await flushPromises()
    expect(result.isRemoving.value).toBe(false)
    unmount()
  })

  it('should expose isError as false when data loads correctly', async () => {
    const { result, unmount } = setupWithAuthUser()
    await flushPromises()
    expect(result.isError.value).toBe(false)
    unmount()
  })
})
