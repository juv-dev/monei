import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useDashboard } from '~/modules/dashboard/composables/useDashboard'
import { ingresosApi } from '~/modules/ingresos/services/api'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import { deudasApi } from '~/modules/deudas/services/api'
import { tarjetasApi } from '~/modules/tarjetas/services/api'

describe('should useDashboard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const sampleDeuda = {
    nombrePersona: 'Juan',
    totalDeuda: 5000,
    tasaInteres: 2,
    cuotasPagadas: 1,
    montoActualPendiente: 4000,
    descripcion: 'Deuda personal',
  }

  const sampleTarjeta = {
    lineaTotal: 10000,
    montoDeudaActual: 2000,
    descripcion: 'Visa',
  }

  function setupWithUser(username = 'jugaz') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useDashboard()
    })
  }

  it('should return zero totals when all modules are empty', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.resumen.value.totalIngresos).toBe(0)
    expect(result.resumen.value.totalGastado).toBe(0)
    expect(result.resumen.value.totalDeudas).toBe(0)
    expect(result.resumen.value.totalPendienteDeudas).toBe(0)
    expect(result.resumen.value.totalTarjetas).toBe(0)
    expect(result.resumen.value.balance).toBe(0)
    unmount()
  })

  it('should calculate balance as ingresos minus gastado minus pendiente minus tarjetas', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 1000, descripcion: 'Gastos' })
    await deudasApi.create('jugaz', { ...sampleDeuda, montoActualPendiente: 500 })
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, montoDeudaActual: 300 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    // balance = 5000 - 1000 - 500 - 300 = 3200
    expect(result.resumen.value.balance).toBe(3200)
    unmount()
  })

  it('should show negative balance when expenses exceed income', async () => {
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Poco ingreso' })
    await presupuestoApi.create('jugaz', { monto: 2000, descripcion: 'Mucho gasto' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.resumen.value.balance).toBeLessThan(0)
    unmount()
  })

  it('should include all items in todasLasDescripciones', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Ingreso test' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Gasto test' })
    await deudasApi.create('jugaz', { ...sampleDeuda, descripcion: 'Deuda test' })
    await tarjetasApi.create('jugaz', { ...sampleTarjeta, descripcion: 'Tarjeta test' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.todasLasDescripciones.value).toHaveLength(4)
    unmount()
  })

  it('should label descriptions with correct tipo', async () => {
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Mi ingreso' })
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Mi gasto' })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tipos = result.todasLasDescripciones.value.map((d) => d.tipo)
    expect(tipos).toContain('Ingreso')
    expect(tipos).toContain('Gasto')
    unmount()
  })

  it('should compose deuda descripcion as nombrePersona + descripcion', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      nombrePersona: 'María',
      descripcion: 'Préstamo',
    })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    const deudaItem = result.todasLasDescripciones.value.find((d) => d.tipo === 'Deuda')
    expect(deudaItem?.descripcion).toBe('María: Préstamo')
    unmount()
  })

  it('should return empty descriptions list when all modules are empty', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.todasLasDescripciones.value).toHaveLength(0)
    unmount()
  })

  it('should expose isLoading as false when all queries finish', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.isLoading.value).toBe(false)
    unmount()
  })

  it('should aggregate totalDeudas from all deudas totalDeuda', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 3000 })
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 2000 })

    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.resumen.value.totalDeudas).toBe(5000)
    unmount()
  })

  it('should isolate data per user', async () => {
    await ingresosApi.create('fio', { monto: 9000, descripcion: 'Fio salary' })
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Jugaz salary' })

    const { result, unmount } = setupWithUser('fio')
    await flushPromises()

    expect(result.resumen.value.totalIngresos).toBe(9000)
    unmount()
  })
})
