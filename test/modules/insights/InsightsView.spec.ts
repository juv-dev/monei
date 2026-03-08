import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import InsightsView from '~/modules/insights/views/InsightsView.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should InsightsView', () => {
  let uid = 0

  beforeEach(() => {
    localStorage.clear()
    uid = 0
  })

  function mountWithAuthUser() {
    const { wrapper, pinia, router } = mountWithPlugins(InsightsView)
    const auth = useAuthStore(pinia)
    auth.$patch({
      user: { id: 'demo', username: 'test@monei.app', displayName: 'Test', provider: 'demo' },
      isAuthenticated: true,
    })
    return { wrapper, auth, router }
  }

  function nextId() {
    return `seed-${++uid}`
  }

  function seedData(data: {
    ingresos?: { monto: number; descripcion: string }[]
    gastos?: { monto: number; descripcion: string; categoria: string }[]
    deudas?: {
      nombrePersona: string
      totalDeuda: number
      tasaInteres: number
      cuotasPagadas: number
      montoActualPendiente: number
      cuotaMensual?: number
      descripcion: string
    }[]
    tarjetas?: { lineaTotal: number; montoDeudaActual: number; pagoMinimo?: number; descripcion: string }[]
  }) {
    const userId = 'demo'
    const now = new Date().toISOString()
    if (data.ingresos) {
      const items = data.ingresos.map((i) => ({ id: nextId(), userId, createdAt: now, ...i }))
      localStorage.setItem(`finance_${userId}_ingresos`, JSON.stringify(items))
    }
    if (data.gastos) {
      const items = data.gastos.map((g) => ({ id: nextId(), userId, createdAt: now, ...g }))
      localStorage.setItem(`finance_${userId}_presupuesto`, JSON.stringify(items))
    }
    if (data.deudas) {
      const items = data.deudas.map((d) => ({ id: nextId(), userId, createdAt: now, ...d }))
      localStorage.setItem(`finance_${userId}_deudas`, JSON.stringify(items))
    }
    if (data.tarjetas) {
      const items = data.tarjetas.map((t) => ({ id: nextId(), userId, createdAt: now, ...t }))
      localStorage.setItem(`finance_${userId}_tarjetas`, JSON.stringify(items))
    }
  }

  // ─── Renderizado ──────────────────────────────────────────────────────────

  it('should render insights view', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="insights-view"]').exists()).toBe(true)
  })

  it('should show empty state when no data', async () => {
    const { wrapper } = mountWithAuthUser()
    await flushPromises()
    expect(wrapper.find('[data-testid="insights-empty"]').exists()).toBe(true)
  })

  it('should show score section when data exists', async () => {
    seedData({ ingresos: [{ monto: 5000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="score-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="score-value"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="score-label"]').exists()).toBe(true)
  })

  it('should show score breakdown items', async () => {
    seedData({ ingresos: [{ monto: 5000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="score-breakdown-item"]')
    expect(items).toHaveLength(4)
  })

  // ─── Alertas ──────────────────────────────────────────────────────────────

  it('should show alerts section with info alerts for empty data', async () => {
    seedData({ ingresos: [{ monto: 1000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    // Has income but no expenses → "Sin gastos registrados" alert
    expect(wrapper.find('[data-testid="alerts-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="alert-card"]').length).toBeGreaterThan(0)
  })

  it('should show alert cards for overspending', async () => {
    seedData({
      ingresos: [{ monto: 1000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 2000, descripcion: 'Exceso', categoria: 'General' }],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="alert-card"]').length).toBeGreaterThan(0)
  })

  // ─── Categorías ───────────────────────────────────────────────────────────

  it('should show category section when gastos exist', async () => {
    seedData({
      gastos: [
        { monto: 500, descripcion: 'Comida', categoria: 'Alimentación' },
        { monto: 300, descripcion: 'Bus', categoria: 'Transporte' },
      ],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="category-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="category-item"]')).toHaveLength(2)
  })

  it('should not show category section when no gastos', async () => {
    seedData({ ingresos: [{ monto: 5000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="category-section"]').exists()).toBe(false)
  })

  // ─── Deudas ───────────────────────────────────────────────────────────────

  it('should show debt projections when deudas with cuotaMensual exist', async () => {
    seedData({
      deudas: [
        {
          nombrePersona: 'Banco',
          totalDeuda: 5000,
          tasaInteres: 10,
          cuotasPagadas: 0,
          montoActualPendiente: 5000,
          cuotaMensual: 500,
          descripcion: 'Préstamo',
        },
      ],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="debt-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="debt-projection-card"]')).toHaveLength(1)
  })

  it('should not show debt section when no deudas', async () => {
    seedData({ ingresos: [{ monto: 5000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="debt-section"]').exists()).toBe(false)
  })

  // ─── Crédito ──────────────────────────────────────────────────────────────

  it('should show credit health section when tarjetas exist', async () => {
    seedData({
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 3000, descripcion: 'Visa' }],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="credit-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="credit-card-item"]')).toHaveLength(1)
  })

  it('should not show credit section when no tarjetas', async () => {
    seedData({ ingresos: [{ monto: 5000, descripcion: 'Sueldo' }] })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="credit-section"]').exists()).toBe(false)
  })

  // ─── Tips ─────────────────────────────────────────────────────────────────

  it('should show tips section when recommendations are available', async () => {
    seedData({
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 4200, descripcion: 'Gastos', categoria: 'General' }],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="tips-section"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="tip-card"]').length).toBeGreaterThan(0)
  })

  // ─── Full scenario ────────────────────────────────────────────────────────

  it('should render all sections with complete data', async () => {
    seedData({
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [
        { monto: 1000, descripcion: 'Comida', categoria: 'Alimentación' },
        { monto: 500, descripcion: 'Bus', categoria: 'Transporte' },
      ],
      deudas: [
        {
          nombrePersona: 'Banco',
          totalDeuda: 10000,
          tasaInteres: 18,
          cuotasPagadas: 2,
          montoActualPendiente: 8000,
          cuotaMensual: 600,
          descripcion: 'Préstamo personal',
        },
      ],
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 4000, descripcion: 'Visa' }],
    })
    const { wrapper } = mountWithAuthUser()
    await flushPromises()

    expect(wrapper.find('[data-testid="insights-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="score-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="category-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="debt-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="credit-section"]').exists()).toBe(true)
  })
})
