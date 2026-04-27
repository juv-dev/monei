import { computed } from 'vue'
import { useIngresos } from '~/modules/ingresos/composables/useIngresos'
import { usePresupuesto } from '~/modules/presupuesto/composables/usePresupuesto'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import type { DescripcionResumen, ResumenGeneral } from '~/shared/types'

export function useDashboard() {
  const { ingresos, totalIngresos, isLoading: loadingIngresos } = useIngresos()
  const { gastos, totalGastado, isLoading: loadingGastos } = usePresupuesto()
  const { deudas, totalDeudas, totalPendiente, isLoading: loadingDeudas } = useDeudas()
  const { tarjetas, totalTarjetas, lineaTotalCombinada, isLoading: loadingTarjetas } = useTarjetas()
  const { usdToPen } = useExchangeRate()

  const isLoading = computed(
    () => loadingIngresos.value || loadingGastos.value || loadingDeudas.value || loadingTarjetas.value,
  )

  const totalCuotaMensual = computed(() =>
    deudas.value.reduce((sum, d) => sum + (d.cuotaMensual ?? d.montoActualPendiente), 0),
  )

  const totalPagoMes = computed(() =>
    tarjetas.value.reduce(
      (sum, t) => sum + (t.montoDeudaActual ?? 0) + usdToPen(t.montoDeudaActualUsd ?? 0),
      0,
    ),
  )

  const totalPagoMinimo = computed(() =>
    tarjetas.value.reduce(
      (sum, t) => sum + (t.pagoMinimo ?? 0) + usdToPen(t.pagoMinimoUsd ?? 0),
      0,
    ),
  )

  const totalArrastre = computed(() => Math.max(totalPagoMes.value - totalPagoMinimo.value, 0))

  const resumen = computed<ResumenGeneral>(() => ({
    totalIngresos: totalIngresos.value,
    totalGastado: totalGastado.value,
    totalDeudas: totalDeudas.value,
    totalPendienteDeudas: totalPendiente.value,
    totalCuotaMensualDeudas: totalCuotaMensual.value,
    totalTarjetas: totalTarjetas.value,
    balance: totalIngresos.value - totalGastado.value - totalCuotaMensual.value - totalTarjetas.value,
  }))

  const todasLasDescripciones = computed<DescripcionResumen[]>(() => [
    ...ingresos.value.map(
      (i): DescripcionResumen => ({
        tipo: 'Ingreso',
        descripcion: i.descripcion,
        monto: i.monto,
      }),
    ),
    ...gastos.value.map(
      (g): DescripcionResumen => ({
        tipo: 'Gasto',
        descripcion: g.descripcion,
        monto: g.monto,
      }),
    ),
    ...deudas.value.map(
      (d): DescripcionResumen => ({
        tipo: 'Deuda',
        descripcion: `${d.nombrePersona}: ${d.descripcion}`,
        monto: d.cuotaMensual ?? d.montoActualPendiente,
      }),
    ),
    ...tarjetas.value.map(
      (t): DescripcionResumen => ({
        tipo: 'Tarjeta',
        descripcion: t.descripcion,
        monto: t.montoDeudaActual,
      }),
    ),
  ])

  return {
    resumen,
    todasLasDescripciones,
    totalPagoMinimo,
    totalPagoMes,
    totalArrastre,
    lineaTotalCombinada,
    isLoading,
  }
}
