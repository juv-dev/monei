import { computed } from 'vue'
import { useIngresos } from '~/modules/ingresos/composables/useIngresos'
import { usePresupuesto } from '~/modules/presupuesto/composables/usePresupuesto'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import type {
  FinancialScore,
  ScoreLabel,
  InsightAlert,
  CategoryAnalysis,
  DebtProjection,
  CreditHealth,
  CreditStatus,
  PersonalizedTip,
} from '../types'

function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bueno'
  if (score >= 40) return 'Regular'
  return 'Crítico'
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#16A34A'
  if (score >= 60) return '#2D9F8F'
  if (score >= 40) return '#D4A017'
  return '#DC2626'
}

function getCreditStatus(pct: number): CreditStatus {
  if (pct < 30) return 'bueno'
  if (pct < 50) return 'moderado'
  if (pct < 75) return 'alto'
  return 'critico'
}

export function useInsights() {
  const { totalIngresos, isLoading: loadingIngresos } = useIngresos()
  const { porCategoria, totalGastado, isLoading: loadingGastos } = usePresupuesto()
  const { deudas, isLoading: loadingDeudas } = useDeudas()
  const { tarjetas, totalTarjetas, lineaTotalCombinada, isLoading: loadingTarjetas } = useTarjetas()

  const isLoading = computed(
    () => loadingIngresos.value || loadingGastos.value || loadingDeudas.value || loadingTarjetas.value,
  )

  const totalCuotaMensual = computed(() =>
    deudas.value.reduce((sum, d) => sum + (d.cuotaMensual ?? d.montoActualPendiente), 0),
  )

  const compromisosFijos = computed(() => totalCuotaMensual.value + totalTarjetas.value)

  const margenParaGastos = computed(() => totalIngresos.value - compromisosFijos.value)

  const hasData = computed(
    () => totalIngresos.value > 0 || totalGastado.value > 0 || deudas.value.length > 0 || tarjetas.value.length > 0,
  )

  // ─── Score Financiero ──────────────────────────────────────────────────────

  const score = computed<FinancialScore>(() => {
    const ingresos = totalIngresos.value

    // Savings ratio (25 pts)
    let savingsRatio = 0
    if (ingresos > 0) {
      const savings = (ingresos - totalGastado.value - compromisosFijos.value) / ingresos
      if (savings >= 0.2) savingsRatio = 25
      else if (savings >= 0.1) savingsRatio = 18
      else if (savings >= 0) savingsRatio = 10
    }

    // Credit utilization (25 pts)
    let creditUtilization = 25
    if (lineaTotalCombinada.value > 0) {
      const pct = totalTarjetas.value / lineaTotalCombinada.value
      if (pct >= 0.75) creditUtilization = 0
      else if (pct >= 0.5) creditUtilization = 8
      else if (pct >= 0.3) creditUtilization = 15
    }

    // Expense control (25 pts)
    let expenseControl = 25
    if (margenParaGastos.value > 0) {
      const ratio = totalGastado.value / margenParaGastos.value
      if (ratio > 1) expenseControl = 0
      else if (ratio > 0.9) expenseControl = 10
      else if (ratio > 0.7) expenseControl = 18
    } else if (ingresos > 0) {
      expenseControl = 0
    }

    // Debt management (25 pts)
    let debtManagement = 25
    if (ingresos > 0 && totalCuotaMensual.value > 0) {
      const ratio = totalCuotaMensual.value / ingresos
      if (ratio > 0.6) debtManagement = 0
      else if (ratio > 0.4) debtManagement = 8
      else if (ratio > 0.2) debtManagement = 15
    }

    const total = savingsRatio + creditUtilization + expenseControl + debtManagement

    return {
      total,
      savingsRatio,
      creditUtilization,
      expenseControl,
      debtManagement,
      label: getScoreLabel(total),
      color: getScoreColor(total),
    }
  })

  // ─── Alertas ───────────────────────────────────────────────────────────────

  const alerts = computed<InsightAlert[]>(() => {
    const result: InsightAlert[] = []
    const ingresos = totalIngresos.value
    const balance = ingresos - totalGastado.value - compromisosFijos.value

    if (ingresos > 0 && balance < 0) {
      result.push({
        id: 'negative-balance',
        severity: 'critical',
        title: 'Gastas más de lo que ganas',
        description: `Tu balance es negativo por S/${Math.abs(balance).toFixed(2)}. Revisa tus gastos y compromisos.`,
      })
    }

    if (lineaTotalCombinada.value > 0) {
      const pct = totalTarjetas.value / lineaTotalCombinada.value
      if (pct > 0.3) {
        result.push({
          id: 'high-credit',
          severity: pct > 0.75 ? 'critical' : 'warning',
          title: 'Utilización crediticia alta',
          description: `Estás usando el ${(pct * 100).toFixed(0)}% de tu línea de crédito. Lo recomendado es menos del 30%.`,
        })
      }
    }

    if (ingresos > 0 && compromisosFijos.value / ingresos > 0.4) {
      result.push({
        id: 'high-commitments',
        severity: 'warning',
        title: 'Compromisos fijos elevados',
        description: `Tus cuotas mensuales representan el ${((compromisosFijos.value / ingresos) * 100).toFixed(0)}% de tus ingresos.`,
      })
    }

    if (ingresos > 0) {
      const savingsRate = (ingresos - totalGastado.value - compromisosFijos.value) / ingresos
      if (savingsRate >= 0 && savingsRate < 0.05) {
        result.push({
          id: 'low-savings',
          severity: 'warning',
          title: 'Tasa de ahorro muy baja',
          description: `Solo ahorras el ${(savingsRate * 100).toFixed(1)}% de tus ingresos. Intenta llegar al 20%.`,
        })
      }
    }

    if (ingresos === 0) {
      result.push({
        id: 'no-income',
        severity: 'info',
        title: 'Sin ingresos registrados',
        description: 'Agrega tus ingresos para obtener un análisis completo.',
      })
    }

    if (totalGastado.value === 0) {
      result.push({
        id: 'no-expenses',
        severity: 'info',
        title: 'Sin gastos registrados',
        description: 'Agrega tus gastos para analizar tu presupuesto.',
      })
    }

    return result
  })

  // ─── Análisis de Gastos ────────────────────────────────────────────────────

  const categoryAnalysis = computed<CategoryAnalysis[]>(() => {
    const total = totalGastado.value
    if (total === 0) return []

    return porCategoria.value
      .map((cat) => ({
        nombre: cat.nombre,
        monto: cat.subtotal,
        porcentaje: (cat.subtotal / total) * 100,
      }))
      .sort((a, b) => b.monto - a.monto)
  })

  // ─── Proyección de Deudas ─────────────────────────────────────────────────

  const debtProjections = computed<DebtProjection[]>(() => {
    return deudas.value
      .filter((d) => d.montoActualPendiente > 0 && (d.cuotaMensual ?? 0) > 0)
      .map((d) => {
        const cuota = d.cuotaMensual!
        const tasaMensual = d.tasaInteres / 100 / 12
        let mesesRestantes: number
        let totalIntereses: number

        if (tasaMensual > 0) {
          // Amortization with interest
          const pendiente = d.montoActualPendiente
          if (cuota <= pendiente * tasaMensual) {
            // Payment doesn't cover interest — infinite
            mesesRestantes = Infinity
            totalIntereses = Infinity
          } else {
            mesesRestantes = Math.ceil(
              -Math.log(1 - (pendiente * tasaMensual) / cuota) / Math.log(1 + tasaMensual),
            )
            totalIntereses = cuota * mesesRestantes - pendiente
          }
        } else {
          mesesRestantes = Math.ceil(d.montoActualPendiente / cuota)
          totalIntereses = 0
        }

        const fechaEstimada = new Date()
        fechaEstimada.setMonth(fechaEstimada.getMonth() + (isFinite(mesesRestantes) ? mesesRestantes : 0))

        return {
          deudaId: d.id,
          nombrePersona: d.nombrePersona,
          mesesRestantes,
          fechaEstimada: isFinite(mesesRestantes) ? fechaEstimada.toISOString().slice(0, 7) : 'N/A',
          totalIntereses: isFinite(totalIntereses) ? totalIntereses : 0,
          montoActualPendiente: d.montoActualPendiente,
        }
      })
  })

  // ─── Salud Crediticia ──────────────────────────────────────────────────────

  const creditHealth = computed<CreditHealth[]>(() => {
    return tarjetas.value.map((t) => {
      const utilizacion = t.lineaTotal > 0 ? (t.montoDeudaActual / t.lineaTotal) * 100 : 0
      return {
        tarjetaId: t.id,
        descripcion: t.descripcion,
        utilizacion,
        lineaTotal: t.lineaTotal,
        deudaActual: t.montoDeudaActual,
        status: getCreditStatus(utilizacion),
      }
    })
  })

  const creditUtilizationTotal = computed(() => {
    if (lineaTotalCombinada.value === 0) return 0
    return (totalTarjetas.value / lineaTotalCombinada.value) * 100
  })

  // ─── Tips Personalizados ───────────────────────────────────────────────────

  const tips = computed<PersonalizedTip[]>(() => {
    const result: PersonalizedTip[] = []
    const ingresos = totalIngresos.value

    if (ingresos > 0) {
      const savingsRate = (ingresos - totalGastado.value - compromisosFijos.value) / ingresos
      if (savingsRate < 0.2 && savingsRate >= 0) {
        const needed = ingresos * 0.2 - (ingresos - totalGastado.value - compromisosFijos.value)
        result.push({
          id: 'tip-savings',
          text: `Reduce S/${needed.toFixed(2)} en gastos para alcanzar un 20% de ahorro mensual.`,
          category: 'ahorro',
        })
      }
    }

    // Top expensive category tip
    const cats = categoryAnalysis.value
    if (cats.length > 0 && cats[0].porcentaje > 40) {
      result.push({
        id: 'tip-top-category',
        text: `"${cats[0].nombre}" representa el ${cats[0].porcentaje.toFixed(0)}% de tus gastos. Considera diversificar.`,
        category: 'gasto',
      })
    }

    // Debt optimization
    const highInterest = deudas.value
      .filter((d) => d.tasaInteres > 15 && d.montoActualPendiente > 0)
      .sort((a, b) => b.tasaInteres - a.tasaInteres)
    if (highInterest.length > 0) {
      const d = highInterest[0]
      result.push({
        id: 'tip-high-interest',
        text: `Prioriza pagar la deuda con ${d.nombrePersona} (${d.tasaInteres}% interés) para ahorrar en intereses.`,
        category: 'deuda',
      })
    }

    // Credit utilization tip
    if (creditUtilizationTotal.value > 30) {
      result.push({
        id: 'tip-credit',
        text: `Tu utilización crediticia es ${creditUtilizationTotal.value.toFixed(0)}%. Paga más para bajarla al 30% y mejorar tu perfil.`,
        category: 'credito',
      })
    }

    // Positive reinforcement
    if (ingresos > 0 && totalGastado.value < margenParaGastos.value * 0.7) {
      result.push({
        id: 'tip-good-control',
        text: 'Buen trabajo controlando tus gastos. Estás usando menos del 70% de tu margen disponible.',
        category: 'ahorro',
      })
    }

    return result.slice(0, 5)
  })

  return {
    isLoading,
    hasData,
    score,
    alerts,
    categoryAnalysis,
    debtProjections,
    creditHealth,
    creditUtilizationTotal,
    tips,
  }
}
