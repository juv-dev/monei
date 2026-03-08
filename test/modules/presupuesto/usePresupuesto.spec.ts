import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { usePresupuesto, PRESUPUESTO_QUERY_KEY } from '~/modules/presupuesto/composables/usePresupuesto'
import { presupuestoApi } from '~/modules/presupuesto/services/api'

describe('should usePresupuesto', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function setupWithUser(username = 'demo') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return usePresupuesto()
    })
  }

  it('should return empty gastos and zero total initially', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.gastos.value).toEqual([])
    expect(result.totalGastado.value).toBe(0)
    unmount()
  })

  it('should load existing gastos from localStorage', async () => {
    await presupuestoApi.create('demo', { monto: 200, descripcion: 'Comida', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 100, descripcion: 'Transporte', categoria: 'Personal' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.gastos.value).toHaveLength(2)
    expect(result.totalGastado.value).toBe(300)
    unmount()
  })

  it('should calculate totalGastado correctly', async () => {
    await presupuestoApi.create('demo', { monto: 500, descripcion: 'Renta', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 300, descripcion: 'Servicios', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 200, descripcion: 'Comida', categoria: 'Alimentación' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.totalGastado.value).toBe(1000)
    unmount()
  })

  it('should add gasto via mutation', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.addGasto({ monto: 450, descripcion: 'Supermercado', categoria: 'Alimentación' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('demo')
    expect(stored).toHaveLength(1)
    expect(stored[0].monto).toBe(450)
    unmount()
  })

  it('should remove gasto via mutation', async () => {
    const item = await presupuestoApi.create('demo', {
      monto: 150,
      descripcion: 'Farmacia',
      categoria: 'Salud',
    })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    result.removeGasto(item.id)
    await flushPromises()

    const stored = await presupuestoApi.getAll('demo')
    expect(stored).toHaveLength(0)
    unmount()
  })

  it('should expose correct query key', () => {
    const key = PRESUPUESTO_QUERY_KEY('fio')
    expect(key).toEqual(['finance', 'fio', 'presupuesto'])
  })

  it('should be disabled when no user is authenticated', async () => {
    const { result, unmount } = withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: null, isAuthenticated: false })
      return usePresupuesto()
    })
    await flushPromises()

    expect(result.gastos.value).toEqual([])
    expect(result.totalGastado.value).toBe(0)
    unmount()
  })

  it('should isolate gastos between users', async () => {
    await presupuestoApi.create('demo', { monto: 100, descripcion: 'Gas jugaz', categoria: 'Casa' })
    await presupuestoApi.create('fio', { monto: 200, descripcion: 'Gas fio', categoria: 'Casa' })

    const { result, unmount } = setupWithUser('fio')
    await flushPromises()

    expect(result.gastos.value).toHaveLength(1)
    expect(result.gastos.value[0].descripcion).toBe('Gas fio')
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

  it('should group gastos por categoria', async () => {
    await presupuestoApi.create('demo', { monto: 100, descripcion: 'Luz', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 200, descripcion: 'Gas', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 50, descripcion: 'Bus', categoria: 'Transporte' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.porCategoria.value).toHaveLength(2)
    const casa = result.porCategoria.value.find((c) => c.nombre === 'Casa')
    expect(casa).toBeDefined()
    expect(casa!.subtotal).toBe(300)
    expect(casa!.items).toHaveLength(2)
    unmount()
  })

  it('should expose unique categorias list', async () => {
    await presupuestoApi.create('demo', { monto: 100, descripcion: 'A', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 100, descripcion: 'B', categoria: 'Casa' })
    await presupuestoApi.create('demo', { monto: 50, descripcion: 'C', categoria: 'Salud' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.categorias.value).toHaveLength(2)
    expect(result.categorias.value).toContain('Casa')
    expect(result.categorias.value).toContain('Salud')
    unmount()
  })

  it('should fallback to General for legacy gastos without categoria', async () => {
    // Simulate legacy data stored without categoria field (e.g. old app data)
    const legacyData = JSON.stringify([
      {
        id: 'legacy-1',
        userId: 'demo',
        monto: 75,
        descripcion: 'Old item',
        createdAt: new Date().toISOString(),
      },
    ])
    localStorage.setItem('finance_demo_presupuesto', legacyData)

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.porCategoria.value[0].nombre).toBe('General')
    expect(result.categorias.value).toContain('General')
    unmount()
  })
})
