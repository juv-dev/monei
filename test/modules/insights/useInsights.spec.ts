import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useInsights } from '~/modules/insights/composables/useInsights'

describe('should useInsights', () => {
  let uid = 0

  beforeEach(() => {
    localStorage.clear()
    uid = 0
  })

  function setupWithUser(username = 'jugaz') {
    return withSetup(() => {
      const auth = useAuthStore()
      auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
      return useInsights()
    })
  }

  function nextId() { return `seed-${++uid}` }

  function seedData(userId: string, data: {
    ingresos?: { monto: number; descripcion: string }[]
    gastos?: { monto: number; descripcion: string; categoria: string }[]
    deudas?: { nombrePersona: string; totalDeuda: number; tasaInteres: number; cuotasPagadas: number; montoActualPendiente: number; cuotaMensual?: number; descripcion: string }[]
    tarjetas?: { lineaTotal: number; montoDeudaActual: number; pagoMinimo?: number; descripcion: string }[]
  }) {
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

  // ─── hasData ──────────────────────────────────────────────────────────────

  it('should return hasData false when no data exists', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.hasData.value).toBe(false)
    unmount()
  })

  it('should return hasData true when ingresos exist', async () => {
    seedData('jugaz', { ingresos: [{ monto: 1000, descripcion: 'Sueldo' }] })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.hasData.value).toBe(true)
    unmount()
  })

  // ─── Score Financiero ─────────────────────────────────────────────────────

  it('should return max score when no financial activity', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // No income: savings=0, credit=25, expense=25, debt=25
    expect(result.score.value.savingsRatio).toBe(0)
    expect(result.score.value.creditUtilization).toBe(25)
    expect(result.score.value.expenseControl).toBe(25)
    expect(result.score.value.debtManagement).toBe(25)
    expect(result.score.value.total).toBe(75)
    expect(result.score.value.label).toBe('Bueno')
    unmount()
  })

  it('should return Excelente score with healthy finances', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 1000, descripcion: 'Comida', categoria: 'Alimentación' }],
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 1000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.score.value.total).toBeGreaterThanOrEqual(80)
    expect(result.score.value.label).toBe('Excelente')
    unmount()
  })

  it('should return Crítico score with overspending', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 1000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 2000, descripcion: 'Exceso', categoria: 'General' }],
      deudas: [{ nombrePersona: 'Banco', totalDeuda: 10000, tasaInteres: 30, cuotasPagadas: 0, montoActualPendiente: 10000, cuotaMensual: 800, descripcion: 'Préstamo' }],
      tarjetas: [{ lineaTotal: 5000, montoDeudaActual: 4500, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.score.value.total).toBeLessThan(40)
    expect(result.score.value.label).toBe('Crítico')
    unmount()
  })

  it('should give full savings points with 20%+ savings rate', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 3000, descripcion: 'Gastos', categoria: 'General' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // savings = (5000-3000) / 5000 = 40% → 25pts
    expect(result.score.value.savingsRatio).toBe(25)
    unmount()
  })

  it('should give partial savings points with 10-20% savings rate', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 4200, descripcion: 'Gastos', categoria: 'General' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // savings = (5000-4200) / 5000 = 16% → 18pts
    expect(result.score.value.savingsRatio).toBe(18)
    unmount()
  })

  it('should give full credit score with low utilization', async () => {
    seedData('jugaz', {
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 2000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // 20% utilization → 25pts
    expect(result.score.value.creditUtilization).toBe(25)
    unmount()
  })

  it('should penalize high credit utilization', async () => {
    seedData('jugaz', {
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 8000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // 80% utilization → 0pts
    expect(result.score.value.creditUtilization).toBe(0)
    unmount()
  })

  // ─── Alertas ──────────────────────────────────────────────────────────────

  it('should show no-income and no-expenses alerts when no data', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const ids = result.alerts.value.map((a) => a.id)
    expect(ids).toContain('no-income')
    expect(ids).toContain('no-expenses')
    unmount()
  })

  it('should show negative balance alert when overspending', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 1000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 1500, descripcion: 'Exceso', categoria: 'General' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const negAlert = result.alerts.value.find((a) => a.id === 'negative-balance')
    expect(negAlert).toBeDefined()
    expect(negAlert!.severity).toBe('critical')
    unmount()
  })

  it('should show high credit alert when utilization > 30%', async () => {
    seedData('jugaz', {
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 5000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const creditAlert = result.alerts.value.find((a) => a.id === 'high-credit')
    expect(creditAlert).toBeDefined()
    expect(creditAlert!.severity).toBe('warning')
    unmount()
  })

  it('should show critical credit alert when utilization > 75%', async () => {
    seedData('jugaz', {
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 8000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const creditAlert = result.alerts.value.find((a) => a.id === 'high-credit')
    expect(creditAlert).toBeDefined()
    expect(creditAlert!.severity).toBe('critical')
    unmount()
  })

  it('should show high commitments alert', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 2000, descripcion: 'Sueldo' }],
      deudas: [{ nombrePersona: 'Banco', totalDeuda: 5000, tasaInteres: 10, cuotasPagadas: 0, montoActualPendiente: 5000, cuotaMensual: 900, descripcion: 'Préstamo' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const alert = result.alerts.value.find((a) => a.id === 'high-commitments')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('warning')
    unmount()
  })

  it('should not show alerts for healthy finances', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 10000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 2000, descripcion: 'Comida', categoria: 'Alimentación' }],
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 1000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const criticals = result.alerts.value.filter((a) => a.severity === 'critical')
    expect(criticals).toHaveLength(0)
    unmount()
  })

  // ─── Category Analysis ────────────────────────────────────────────────────

  it('should return empty category analysis when no gastos', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.categoryAnalysis.value).toHaveLength(0)
    unmount()
  })

  it('should sort categories by amount descending', async () => {
    seedData('jugaz', {
      gastos: [
        { monto: 500, descripcion: 'Alquiler', categoria: 'Casa' },
        { monto: 1000, descripcion: 'Comida', categoria: 'Alimentación' },
        { monto: 200, descripcion: 'Bus', categoria: 'Transporte' },
      ],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const cats = result.categoryAnalysis.value
    expect(cats).toHaveLength(3)
    expect(cats[0].nombre).toBe('Alimentación')
    expect(cats[1].nombre).toBe('Casa')
    expect(cats[2].nombre).toBe('Transporte')
    unmount()
  })

  it('should calculate correct percentages', async () => {
    seedData('jugaz', {
      gastos: [
        { monto: 750, descripcion: 'Comida', categoria: 'Alimentación' },
        { monto: 250, descripcion: 'Bus', categoria: 'Transporte' },
      ],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.categoryAnalysis.value[0].porcentaje).toBeCloseTo(75, 0)
    expect(result.categoryAnalysis.value[1].porcentaje).toBeCloseTo(25, 0)
    unmount()
  })

  // ─── Debt Projections ─────────────────────────────────────────────────────

  it('should return empty projections when no debts', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.debtProjections.value).toHaveLength(0)
    unmount()
  })

  it('should project debt without interest', async () => {
    seedData('jugaz', {
      deudas: [{
        nombrePersona: 'Amigo',
        totalDeuda: 1000,
        tasaInteres: 0,
        cuotasPagadas: 0,
        montoActualPendiente: 1000,
        cuotaMensual: 200,
        descripcion: 'Préstamo',
      }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.debtProjections.value).toHaveLength(1)
    expect(result.debtProjections.value[0].mesesRestantes).toBe(5)
    expect(result.debtProjections.value[0].totalIntereses).toBe(0)
    unmount()
  })

  it('should project debt with interest', async () => {
    seedData('jugaz', {
      deudas: [{
        nombrePersona: 'Banco',
        totalDeuda: 10000,
        tasaInteres: 12,
        cuotasPagadas: 0,
        montoActualPendiente: 10000,
        cuotaMensual: 500,
        descripcion: 'Préstamo',
      }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const proj = result.debtProjections.value[0]
    expect(proj.mesesRestantes).toBeGreaterThan(20)
    expect(proj.totalIntereses).toBeGreaterThan(0)
    expect(proj.fechaEstimada).not.toBe('N/A')
    unmount()
  })

  it('should skip debts with no cuotaMensual', async () => {
    seedData('jugaz', {
      deudas: [{
        nombrePersona: 'Amigo',
        totalDeuda: 500,
        tasaInteres: 0,
        cuotasPagadas: 0,
        montoActualPendiente: 500,
        descripcion: 'Sin cuota',
      }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // montoActualPendiente > 0 but cuotaMensual is undefined (defaults to montoActualPendiente in dashboard)
    // In useInsights filter: d.cuotaMensual ?? 0 > 0 → 0 > 0 → false → skipped
    expect(result.debtProjections.value).toHaveLength(0)
    unmount()
  })

  // ─── Credit Health ────────────────────────────────────────────────────────

  it('should return empty credit health when no tarjetas', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.creditHealth.value).toHaveLength(0)
    expect(result.creditUtilizationTotal.value).toBe(0)
    unmount()
  })

  it('should calculate credit utilization per card', async () => {
    seedData('jugaz', {
      tarjetas: [
        { lineaTotal: 10000, montoDeudaActual: 2000, descripcion: 'Visa' },
        { lineaTotal: 5000, montoDeudaActual: 4000, descripcion: 'Mastercard' },
      ],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.creditHealth.value).toHaveLength(2)

    const visa = result.creditHealth.value.find((c) => c.descripcion === 'Visa')!
    expect(visa.utilizacion).toBeCloseTo(20, 0)
    expect(visa.status).toBe('bueno')

    const mc = result.creditHealth.value.find((c) => c.descripcion === 'Mastercard')!
    expect(mc.utilizacion).toBeCloseTo(80, 0)
    expect(mc.status).toBe('critico')

    unmount()
  })

  it('should calculate combined credit utilization', async () => {
    seedData('jugaz', {
      tarjetas: [
        { lineaTotal: 10000, montoDeudaActual: 3000, descripcion: 'Visa' },
        { lineaTotal: 10000, montoDeudaActual: 3000, descripcion: 'MC' },
      ],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    // 6000 / 20000 = 30%
    expect(result.creditUtilizationTotal.value).toBeCloseTo(30, 0)
    unmount()
  })

  // ─── Tips ─────────────────────────────────────────────────────────────────

  it('should return savings tip when savings rate below 20%', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 5000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 4200, descripcion: 'Gastos', categoria: 'General' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tip = result.tips.value.find((t) => t.id === 'tip-savings')
    expect(tip).toBeDefined()
    expect(tip!.category).toBe('ahorro')
    unmount()
  })

  it('should return top category tip when one category > 40%', async () => {
    seedData('jugaz', {
      gastos: [
        { monto: 900, descripcion: 'Comida', categoria: 'Alimentación' },
        { monto: 100, descripcion: 'Bus', categoria: 'Transporte' },
      ],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tip = result.tips.value.find((t) => t.id === 'tip-top-category')
    expect(tip).toBeDefined()
    expect(tip!.text).toContain('Alimentación')
    unmount()
  })

  it('should return high interest tip for expensive debts', async () => {
    seedData('jugaz', {
      deudas: [{
        nombrePersona: 'Banco Caro',
        totalDeuda: 5000,
        tasaInteres: 25,
        cuotasPagadas: 0,
        montoActualPendiente: 5000,
        cuotaMensual: 300,
        descripcion: 'Préstamo caro',
      }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tip = result.tips.value.find((t) => t.id === 'tip-high-interest')
    expect(tip).toBeDefined()
    expect(tip!.text).toContain('Banco Caro')
    expect(tip!.category).toBe('deuda')
    unmount()
  })

  it('should return credit tip when utilization > 30%', async () => {
    seedData('jugaz', {
      tarjetas: [{ lineaTotal: 10000, montoDeudaActual: 5000, descripcion: 'Visa' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tip = result.tips.value.find((t) => t.id === 'tip-credit')
    expect(tip).toBeDefined()
    expect(tip!.category).toBe('credito')
    unmount()
  })

  it('should return good control tip when spending is well controlled', async () => {
    seedData('jugaz', {
      ingresos: [{ monto: 10000, descripcion: 'Sueldo' }],
      gastos: [{ monto: 2000, descripcion: 'Comida', categoria: 'Alimentación' }],
    })
    const { result, unmount } = setupWithUser()
    await flushPromises()

    const tip = result.tips.value.find((t) => t.id === 'tip-good-control')
    expect(tip).toBeDefined()
    expect(tip!.category).toBe('ahorro')
    unmount()
  })

  it('should limit tips to max 5', async () => {
    const { result, unmount } = setupWithUser()
    await flushPromises()

    expect(result.tips.value.length).toBeLessThanOrEqual(5)
    unmount()
  })
})
