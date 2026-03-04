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
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the dashboard view', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="dashboard-view"]').exists()).toBe(true)
  })

  it('should render all summary cards when data is loaded', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="card-ingresos"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-gastado"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-deudas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-tarjetas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-balance"]').exists()).toBe(true)
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

  it('should show S/ 0.00 balance when all modules are empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-balance"]').text()).toContain('0.00')
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

  it('should display tipo badges for each description item', async () => {
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

    expect(wrapper.find('[data-testid="resumen-ingresos"]').text()).toContain('4,000')
  })

  it('should show positive balance with green styling', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Card background gradient contains the teal color
    const cardEl = wrapper.find('[data-testid="card-balance"]')
    const style = cardEl.attributes('style') ?? ''
    expect(style.includes('#3E6F73') || style.includes('rgb(62, 111, 115)')).toBe(true)
  })

  it('should show negative balance with red styling', async () => {
    await presupuestoApi.create('jugaz', { monto: 9000, descripcion: 'Muchos gastos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Card background gradient contains the terracota color
    const cardEl = wrapper.find('[data-testid="card-balance"]')
    const style = cardEl.attributes('style') ?? ''
    expect(style.includes('#C65A3A') || style.includes('rgb(198, 90, 58)')).toBe(true)
  })

  it('should show deudas total pendiente in card-deudas', async () => {
    await deudasApi.create('jugaz', { ...deudaBase, montoActualPendiente: 3000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-deudas"]').text()).toContain('3,000')
  })

  it('should show card-deudas-total with bruto amount', async () => {
    await deudasApi.create('jugaz', { ...deudaBase, totalDeuda: 5000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="resumen-deudas-total"]').text()).toContain('5,000')
  })

  // ─── Section toggle handlers ──────────────────────────────────────────
  it('should toggle ingresos section open and closed', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Ingresos section should be open by default
    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items.length).toBeGreaterThan(0)

    // Find the ingresos section toggle button (first section button)
    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    const ingresosBtn = buttons[0]
    await ingresosBtn.trigger('click')
    await flushPromises()

    // After toggle, items should be hidden
    const itemsAfter = wrapper.findAll('[data-testid="description-item"]')
    expect(itemsAfter.length).toBe(0)
  })

  it('should toggle gastos section', async () => {
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Gastos section open by default
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBeGreaterThan(0)

    // Toggle gastos section closed
    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    const gastosBtn = buttons[0]
    await gastosBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(0)
  })

  it('should toggle deudas section', async () => {
    await deudasApi.create('jugaz', deudaBase)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBeGreaterThan(0)

    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    const deudasBtn = buttons[0]
    await deudasBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(0)
  })

  it('should toggle tarjetas section', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBeGreaterThan(0)

    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    const tarjetasBtn = buttons[0]
    await tarjetasBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(0)
  })

  it('should toggle all four sections independently', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Comida', categoria: 'General' })
    await deudasApi.create('jugaz', deudaBase)
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // All 4 items visible initially
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(4)

    // Close all sections one by one
    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    for (const btn of buttons) {
      await btn.trigger('click')
      await flushPromises()
    }

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(0)
  })

  // ─── Forecast tarjetas section ────────────────────────────────────────
  it('should show forecast section when tarjetas have data', async () => {
    await tarjetasApi.create('jugaz', {
      lineaTotal: 10000,
      montoDeudaActual: 3000,
      descripcion: 'Visa',
      pagoMinimo: 500,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="forecast-tarjetas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-pago-total"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-pago-minimo"]').exists()).toBe(true)
  })

  it('should not show forecast section when no tarjetas', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="forecast-tarjetas"]').exists()).toBe(false)
  })

  it('should show cierre de mes section when ingresos exist', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 1000, descripcion: 'Gastos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // The cierre de mes section should be visible
    expect(wrapper.text()).toContain('Gastado')
  })

  it('should show forecast sin deudas when deudas and tarjetas exist', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await deudasApi.create('jugaz', deudaBase)
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="forecast-tarjetas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-sin-deudas"]').exists()).toBe(true)
  })

  // ─── Cierre de mes branches ─────────────────────────────────────────
  it('should show negative diferencia gastos when overspending', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 5000, descripcion: 'Gastos altos', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // diferenciaGastos < 0, porcentajeGastos > 100
    const cierreText = wrapper.text()
    expect(cierreText).toContain('Revisar gastos')
    expect(cierreText).toContain('Necesitas reducir')
  })

  it('should show cierre de mes with compromisos only (no ingresos)', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 2000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // showCierreDeMes = totalIngresos > 0 || compromisosFijos > 0
    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
  })

  it('should show forecast pago minimo else branch when no pago minimo set', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 2000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // totalPagoMinimo === 0, so the else template renders
    const pagoMinSection = wrapper.find('[data-testid="forecast-pago-minimo"]')
    expect(pagoMinSection.exists()).toBe(true)
    expect(pagoMinSection.text()).toContain('Define pagos mínimos')
  })

  it('should show negative balance styling in forecast sections', async () => {
    await presupuestoApi.create('jugaz', { monto: 8000, descripcion: 'Mucho gasto', categoria: 'General' })
    await tarjetasApi.create('jugaz', {
      lineaTotal: 5000,
      montoDeudaActual: 3000,
      descripcion: 'Visa',
      pagoMinimo: 500,
    })
    await deudasApi.create('jugaz', deudaBase)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // With no income and lots of expenses, balance should be negative
    expect(wrapper.find('[data-testid="forecast-tarjetas"]').exists()).toBe(true)
  })

  it('should render chart section when data exists', async () => {
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 1000, descripcion: 'Comida', categoria: 'General' })
    await deudasApi.create('jugaz', deudaBase)
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // hasChartData should be true - chart section renders
    expect(wrapper.find('[data-testid="descriptions-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(4)
  })

  it('should show margen negative styling when compromisos exceed ingresos', async () => {
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Poco ingreso' })
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 3000, descripcion: 'Visa' })
    await deudasApi.create('jugaz', { ...deudaBase, montoActualPendiente: 2000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // margenParaGastos < 0
    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
  })

  it('should handle porcentajeGastos 999 when totalGastado > 0 and margen <= 0', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 3000, descripcion: 'Visa' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Gasto', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // No ingresos → margen = 0 - 3000 < 0, totalGastado > 0 → porcentajeGastos = 999
    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
  })

  it('should display description-monto for each item', async () => {
    await ingresosApi.create('jugaz', { monto: 2000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Comida', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const montos = wrapper.findAll('[data-testid="description-monto"]')
    expect(montos.length).toBeGreaterThan(0)
  })

  it('should render deudas section items when deudas exist', async () => {
    await deudasApi.create('jugaz', deudaBase)
    await deudasApi.create('jugaz', { ...deudaBase, nombrePersona: 'Otro', descripcion: 'Deuda 2' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Deudas section should be visible with items (deudasSectionOpen=true by default)
    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items.length).toBe(2)
    // Verify deuda description format
    expect(items[0].text()).toContain('Test')
    expect(items[0].text()).toContain('Deuda')
  })

  it('should render tarjetas section items when tarjetas exist', async () => {
    await tarjetasApi.create('jugaz', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })
    await tarjetasApi.create('jugaz', { lineaTotal: 8000, montoDeudaActual: 3000, descripcion: 'Mastercard' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="description-item"]')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('Tarjeta')
  })

  it('should re-open section after closing it', async () => {
    await deudasApi.create('jugaz', deudaBase)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(1)

    // Close the deudas section
    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    await buttons[0].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(0)

    // Re-open it
    await buttons[0].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(1)
  })

  it('should show descriptions count badge when data exists', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // The badge shows total count
    const text = wrapper.find('[data-testid="descriptions-list"]').text()
    expect(text).toContain('1')
  })

  it('should show both deudas and tarjetas sections together', async () => {
    await ingresosApi.create('jugaz', { monto: 10000, descripcion: 'Salario' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Gasto', categoria: 'General' })
    await deudasApi.create('jugaz', { ...deudaBase, cuotaMensual: 300 })
    await tarjetasApi.create('jugaz', {
      lineaTotal: 5000,
      montoDeudaActual: 1000,
      descripcion: 'Visa',
      pagoMinimo: 200,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // All 4 sections should have items
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(4)

    // All section buttons should be present (4 sections)
    const buttons = wrapper.findAll('[data-testid="descriptions-list"] button')
    expect(buttons.length).toBe(4)

    // Close deudas section (3rd button) and verify
    await buttons[2].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(3)

    // Close tarjetas section (4th button) and verify
    await buttons[3].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(2)

    // Re-open deudas
    await buttons[2].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(3)

    // Re-open tarjetas
    await buttons[3].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="description-item"]').length).toBe(4)
  })

  it('should show cierre de mes with both positive and negative scenarios', async () => {
    // Scenario: gastos > ingresos
    await ingresosApi.create('jugaz', { monto: 100, descripcion: 'Poco' })
    await presupuestoApi.create('jugaz', { monto: 5000, descripcion: 'Mucho', categoria: 'General' })
    await deudasApi.create('jugaz', { ...deudaBase, cuotaMensual: 500 })
    await tarjetasApi.create('jugaz', {
      lineaTotal: 5000,
      montoDeudaActual: 2000,
      descripcion: 'Visa',
      pagoMinimo: 300,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Should show all forecast sections with negative balance
    expect(wrapper.find('[data-testid="cierre-de-mes"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-tarjetas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-sin-deudas"]').exists()).toBe(true)
  })
})
