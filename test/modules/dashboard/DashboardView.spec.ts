import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import { ingresosApi } from '~/modules/ingresos/services/api'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import { deudasApi } from '~/modules/deudas/services/api'
import { tarjetasApi } from '~/modules/tarjetas/services/api'
import DashboardView from '~/modules/dashboard/views/DashboardView.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should DashboardView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const deudaBase = {
    nombrePersona: 'Test',
    totalDeuda: 1000,
    tasaInteres: 1,
    cuotasPagadas: 0,
    montoActualPendiente: 800,
    descripcion: 'Deuda test',
  }

  function mountAuthenticated(username = 'jugaz') {
    const { wrapper, pinia } = mountWithPlugins(DashboardView)
    const auth = useAuthStore(pinia)
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true, isTokenReady: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the dashboard view', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)
  })

  it('should render the always-present summary cards', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="card-balance"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-ingresos"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-gastado"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-deudas"]').exists()).toBe(true)
  })

  it('should render resumen ingresos value', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="resumen-ingresos"]').exists()).toBe(true)
  })

  it('should render resumen balance value', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="resumen-balance"]').exists()).toBe(true)
  })

  // ─── Datos vacíos ────────────────────────────────────────────────────────
  it('should show empty descriptions state when no data exists', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="descriptions-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="descriptions-list"]').exists()).toBe(false)
  })

  it('should show S/ 0 balance when all modules are empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-balance"]').text()).toContain('S/ 0')
  })

  // ─── Con datos ───────────────────────────────────────────────────────────
  it('should show descriptions list when modules have data', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Gastos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="descriptions-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="descriptions-empty"]').exists()).toBe(false)
  })

  it('should display correct number of description items', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'A' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'B', categoria: 'General' })
    await deudasApi.create('jugaz', deudaBase)
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'C' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items).toHaveLength(4)
  })

  it('should display tipo for each description item', async () => {
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const tipos = wrapper.findAll('[data-testid="description-type"]')
    const tipoTexts = tipos.map((t) => t.text())
    expect(tipoTexts.some((t) => t.includes('Ingreso'))).toBe(true)
    expect(tipoTexts.some((t) => t.includes('Gasto'))).toBe(true)
  })

  it('should show correct total ingresos', async () => {
    await ingresosApi.create('jugaz', { monto: 3000, descripcion: 'Salario' })
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Bono' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-ingresos"]').text()).toContain('4.0k')
  })

  it('should show positive balance copy', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="card-balance"]').text()).toContain('Te queda margen después de cubrir todo')
  })

  it('should show negative balance copy', async () => {
    await presupuestoApi.create('jugaz', { monto: 9000, descripcion: 'Muchos gastos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="card-balance"]').text()).toContain('Tus compromisos superan tus ingresos')
  })

  it('should show deudas total in card-deudas', async () => {
    await deudasApi.create('jugaz', { ...deudaBase, totalDeuda: 5000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-deudas"]').text()).toContain('5.0k')
  })

  // ─── Plan de cierre del mes ────────────────────────────────────────────
  it('should show cierre de mes section when ingresos exist', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 1000, descripcion: 'Gastos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
  })

  it('should show cierre de mes with compromisos only (no ingresos)', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 2000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
  })

  it('should show negative plan copy when overspending', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 5000, descripcion: 'Gastos altos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const cierreText = wrapper.find('[data-testid="cierre-de-mes"]').text()
    expect(cierreText).toContain('Revisar gastos')
    expect(cierreText).toContain('Necesitás recortar')
  })

  // ─── Filtros de movimientos ────────────────────────────────────────────
  it('should filter movements when a filter chip is clicked', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(2)

    const gastosChip = wrapper.findAll('button').find((b) => b.text() === 'Gastos')
    expect(gastosChip).toBeTruthy()
    await gastosChip!.trigger('click')
    await flushPromises()

    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('Comida')
  })

  it('should show all movements again when Todo filter is reselected', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const ingresosChip = wrapper.findAll('button').find((b) => b.text() === 'Ingresos')
    await ingresosChip!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(1)

    const todoChip = wrapper.findAll('button').find((b) => b.text() === 'Todo')
    await todoChip!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(2)
  })

  it('should display description-monto for each item', async () => {
    await ingresosApi.create('jugaz', { monto: 2000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const montos = wrapper.findAll('[data-testid="description-monto"]')
    expect(montos.length).toBeGreaterThan(0)
  })

  it('should render deudas items when deudas exist', async () => {
    await deudasApi.create('jugaz', deudaBase)
    await deudasApi.create('jugaz', { ...deudaBase, nombrePersona: 'Otro', descripcion: 'Deuda 2' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items.length).toBe(2)
    const texts = items.map((i) => i.text())
    expect(texts.some((t) => t.includes('Test'))).toBe(true)
  })

  // ─── Tarjetas ──────────────────────────────────────────────────────────
  it('should render tarjetas carousel when tarjetas exist', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 10000, montoDeudaActual: 3600, descripcion: 'Visa BCP' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const carousel = wrapper.find('[data-testid="card-tarjetas"]')
    expect(carousel.exists()).toBe(true)
    expect(carousel.text()).toContain('Visa BCP')
  })

  it('should toggle tarjeta pago mode and persist it', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const minBtn = wrapper.find('[data-testid="tarjeta-mode-minimo"]')
    expect(minBtn.exists()).toBe(true)

    await minBtn.trigger('click')
    await flushPromises()
    expect(localStorage.getItem('monei_tarjeta_pago_mode')).toBe('minimo')

    const totalBtn = wrapper.find('[data-testid="tarjeta-mode-total"]')
    await totalBtn.trigger('click')
    await flushPromises()
    expect(localStorage.getItem('monei_tarjeta_pago_mode')).toBe('total')
  })

  it('should show descriptions count', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="dashboard-view"]').text()).toContain('1 este mes')
  })
})
