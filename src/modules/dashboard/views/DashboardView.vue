<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CreditCard,
  Inbox,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  ArrowUpDown,
  Download,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { useDashboard } from '../composables/useDashboard'
import DoughnutChart from '~/shared/components/charts/DoughnutChart.vue'
import OnboardingModal from '~/modules/demo/components/OnboardingModal.vue'
import MonthSelector from '~/shared/components/ui/MonthSelector.vue'
import { useAuthStore } from '~/stores/auth'
import { useIngresos } from '~/modules/ingresos/composables/useIngresos'
import { usePresupuesto } from '~/modules/presupuesto/composables/usePresupuesto'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import { exportReporteToExcel } from '~/modules/reportes/services/exportService'

const auth = useAuthStore()
const showOnboarding = ref(auth.currentUser?.provider === 'demo' && !localStorage.getItem('monei_demo_onboarding_done'))
const { resumen, todasLasDescripciones, totalPagoMinimo, totalPagoMes, totalArrastre, isLoading } = useDashboard()
const { ingresos } = useIngresos()
const { gastos } = usePresupuesto()
const { deudas } = useDeudas()
const { tarjetas } = useTarjetas()
const { rate: usdRate } = useExchangeRate()

const isExporting = ref(false)
async function handleExport(): Promise<void> {
  if (isExporting.value) return
  isExporting.value = true
  try {
    await exportReporteToExcel({
      ingresos: ingresos.value,
      gastos: gastos.value,
      deudas: deudas.value,
      tarjetas: tarjetas.value,
      usdRate: usdRate.value,
      userDisplayName: auth.currentUser?.displayName,
    })
  } finally {
    isExporting.value = false
  }
}

const TARJETA_MODE_KEY = 'monei_tarjeta_pago_mode'
const tarjetaPagoMode = ref<'total' | 'minimo'>(
  (localStorage.getItem(TARJETA_MODE_KEY) as 'total' | 'minimo' | null) ?? 'total',
)
watch(tarjetaPagoMode, (v) => localStorage.setItem(TARJETA_MODE_KEY, v))

const tarjetasCompromiso = computed(() =>
  tarjetaPagoMode.value === 'minimo' ? totalPagoMinimo.value : totalPagoMes.value,
)

const balanceNeto = computed(
  () =>
    resumen.value.totalIngresos -
    resumen.value.totalGastado -
    resumen.value.totalCuotaMensualDeudas -
    tarjetasCompromiso.value,
)

const ingresosSectionOpen = ref(true)
const gastosSectionOpen = ref(true)
const deudasSectionOpen = ref(true)
const tarjetasSectionOpen = ref(true)

const ingresosItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Ingreso'))
const gastosItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Gasto'))
const deudasItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Deuda'))
const tarjetasItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Tarjeta'))

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function formatShort(value: number): string {
  if (value >= 1_000_000) return `S/ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}k`
  return formatCurrency(value)
}

const todayDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

const typeConfig: Record<string, { hex: string; icon: Component }> = {
  Ingreso: { hex: '#10B981', icon: TrendingUp },
  Gasto: { hex: '#F97316', icon: ShoppingBag },
  Deuda: { hex: '#F59E0B', icon: Clock },
  Tarjeta: { hex: '#F43F5E', icon: CreditCard },
}

const compromisosFijos = computed(() => resumen.value.totalCuotaMensualDeudas + tarjetasCompromiso.value)
const margenParaGastos = computed(() => resumen.value.totalIngresos - compromisosFijos.value)
const diferenciaGastos = computed(() => margenParaGastos.value - resumen.value.totalGastado)
const porcentajeGastos = computed(() =>
  margenParaGastos.value > 0
    ? Math.round((resumen.value.totalGastado / margenParaGastos.value) * 100)
    : resumen.value.totalGastado > 0
      ? 999
      : 0,
)
const barGastosWidth = computed(() => Math.min(porcentajeGastos.value, 100) + '%')
const showCierreDeMes = computed(() => resumen.value.totalIngresos > 0 || compromisosFijos.value > 0)

const showForecastTarjetas = computed(() => resumen.value.totalTarjetas > 0)
const ahorroPagoMinimo = computed(() => resumen.value.totalTarjetas - totalPagoMinimo.value)
const balancePagoMinimo = computed(() => resumen.value.balance + ahorroPagoMinimo.value)
const balanceSinDeudas = computed(() => resumen.value.balance + resumen.value.totalCuotaMensualDeudas)

const isPositive = computed(() => balanceNeto.value >= 0)

const hasChartData = computed(
  () =>
    resumen.value.totalIngresos > 0 ||
    resumen.value.totalGastado > 0 ||
    resumen.value.totalPendienteDeudas > 0 ||
    resumen.value.totalTarjetas > 0,
)

const chartLabels = computed(() => ['Ingresos', 'Gastos', 'Deudas', 'Tarjetas'])
const chartValues = computed(() => [
  resumen.value.totalIngresos,
  resumen.value.totalGastado,
  resumen.value.totalPendienteDeudas,
  resumen.value.totalTarjetas,
])
const modernChartColors = ['#10B981', '#F97316', '#F59E0B', '#F43F5E']

type TxGroup = {
  key: 'i' | 'g' | 'd' | 't'
  label: string
  color: string
  sign: '+' | '−'
  items: ReturnType<typeof todasLasDescripciones.value.filter>
  total: number
  open: boolean
}

const transactionGroups = computed<TxGroup[]>(() => [
  { key: 'i', label: 'Ingresos', color: '#10B981', sign: '+', items: ingresosItems.value, total: resumen.value.totalIngresos, open: ingresosSectionOpen.value },
  { key: 'g', label: 'Gastos', color: '#F97316', sign: '−', items: gastosItems.value, total: resumen.value.totalGastado, open: gastosSectionOpen.value },
  { key: 'd', label: 'Deudas', color: '#F59E0B', sign: '−', items: deudasItems.value, total: resumen.value.totalCuotaMensualDeudas, open: deudasSectionOpen.value },
  { key: 't', label: 'Tarjetas', color: '#F43F5E', sign: '−', items: tarjetasItems.value, total: resumen.value.totalTarjetas, open: tarjetasSectionOpen.value },
])

function toggleGroup(key: TxGroup['key']) {
  if (key === 'i') ingresosSectionOpen.value = !ingresosSectionOpen.value
  else if (key === 'g') gastosSectionOpen.value = !gastosSectionOpen.value
  else if (key === 'd') deudasSectionOpen.value = !deudasSectionOpen.value
  else tarjetasSectionOpen.value = !tarjetasSectionOpen.value
}

// Transactions UX: filter tabs + search + sort
type FilterKey = 'all' | 'Ingreso' | 'Gasto' | 'Deuda' | 'Tarjeta'
const activeFilter = ref<FilterKey>('all')
const searchQuery = ref('')
const sortDesc = ref(true)

const filterTabs: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Todo', color: '#6366F1' },
  { key: 'Ingreso', label: 'Ingresos', color: '#10B981' },
  { key: 'Gasto', label: 'Gastos', color: '#F97316' },
  { key: 'Deuda', label: 'Deudas', color: '#F59E0B' },
  { key: 'Tarjeta', label: 'Tarjetas', color: '#F43F5E' },
]

const hasActiveFilterOrSearch = computed(() => activeFilter.value !== 'all' || searchQuery.value.trim() !== '')

const filteredFlatItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = todasLasDescripciones.value.slice()
  if (activeFilter.value !== 'all') list = list.filter((i) => i.tipo === activeFilter.value)
  if (q) list = list.filter((i) => i.descripcion.toLowerCase().includes(q))
  list.sort((a, b) => (sortDesc.value ? b.monto - a.monto : a.monto - b.monto))
  return list
})

const netoMes = computed(() => resumen.value.totalIngresos - resumen.value.totalGastado - compromisosFijos.value)
const totalSalidasMes = computed(() => resumen.value.totalGastado + compromisosFijos.value)

function colorFor(tipo: string): string {
  return typeConfig[tipo]?.hex ?? '#64748B'
}

function signFor(tipo: string): '+' | '−' {
  return tipo === 'Ingreso' ? '+' : '−'
}

function groupTotalFor(tipo: string): number {
  if (tipo === 'Ingreso') return resumen.value.totalIngresos
  if (tipo === 'Gasto') return resumen.value.totalGastado
  if (tipo === 'Deuda') return resumen.value.totalCuotaMensualDeudas
  return resumen.value.totalTarjetas
}

function percentOfGroup(monto: number, tipo: string): number {
  const total = groupTotalFor(tipo)
  if (total <= 0) return 0
  return Math.min(100, Math.round((monto / total) * 100))
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F6F1]" data-testid="dashboard-view">
    <OnboardingModal v-if="showOnboarding" @close="showOnboarding = false" />
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <p class="text-sm text-[#9A9690] mb-1 capitalize">{{ todayDate }}</p>
          <h1 class="text-2xl lg:text-3xl font-bold text-[#1C1B18] tracking-tight">
            Hola, {{ auth.currentUser?.displayName?.split(' ')[0] ?? 'Usuario' }}
          </h1>
        </div>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <MonthSelector />
          <button
            type="button"
            class="flex items-center gap-2 bg-white border border-[#E5E0D5] hover:border-[#A8D4D2] hover:bg-[#EBF5F5] text-[#5A5854] hover:text-[#356E6B] rounded-full px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isExporting || isLoading"
            data-testid="export-excel-btn"
            @click="handleExport"
          >
            <Loader2 v-if="isExporting" :size="14" class="animate-spin" />
            <Download v-else :size="14" />
            <span>{{ isExporting ? 'Generando...' : 'Exportar Excel' }}</span>
          </button>
          <div class="hidden sm:flex items-center gap-2 bg-white border border-[#E5E0D5] rounded-full px-4 py-2 text-xs text-[#9A9690]">
            <span class="w-2 h-2 rounded-full bg-[#3D9970] animate-pulse"></span>
            Actualizado
          </div>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-3 py-24 text-slate-400"
        data-testid="loading-state"
      >
        <Loader2 :size="28" class="animate-spin" aria-hidden="true" />
        <span class="text-sm">Cargando tu resumen...</span>
      </div>

      <template v-else>
        <!-- Balance + stat grid -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6" data-testid="card-balance">
          <!-- Balance (highlighted, wide) -->
          <div
            class="col-span-2 rounded-2xl p-4 lg:p-5 border shadow-sm"
            :style="isPositive
              ? 'background: linear-gradient(135deg, #EBF5F5 0%, #D5EDED 100%); border-color: rgba(77, 155, 151, 0.25);'
              : 'background: linear-gradient(135deg, #FEF1F0 0%, #FDE4E2 100%); border-color: rgba(192, 91, 82, 0.25);'"
          >
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center"
                :style="isPositive
                  ? 'background: rgba(77, 155, 151, 0.14);'
                  : 'background: rgba(192, 91, 82, 0.12);'"
              >
                <component :is="isPositive ? ArrowUpRight : ArrowDownRight" :size="14" :style="{ color: isPositive ? '#356E6B' : '#C05B52' }" aria-hidden="true" />
              </div>
              <p class="text-[10px] font-semibold uppercase tracking-wider" :style="{ color: isPositive ? '#356E6B' : '#C05B52' }">Balance neto</p>
            </div>
            <p class="text-2xl lg:text-3xl font-black tabular-nums tracking-tight text-[#1C1B18]" data-testid="resumen-balance">
              {{ formatCurrency(balanceNeto) }}
            </p>
            <p class="text-[11px] mt-1 font-medium" :style="{ color: isPositive ? '#356E6B' : '#C05B52' }">
              {{ isPositive ? 'Llegás bien a fin de mes' : 'Revisá tus compromisos' }}
            </p>
          </div>

          <div class="rounded-2xl p-4 bg-white border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)]" data-testid="card-ingresos">
            <div class="flex items-center gap-2 mb-2.5">
              <div class="w-7 h-7 rounded-lg bg-[#EDFAF4] flex items-center justify-center">
                <TrendingUp :size="14" class="text-[#3D9970]" />
              </div>
              <p class="text-xs font-medium text-[#9A9690]">Ingresos</p>
            </div>
            <p class="text-xl lg:text-2xl font-bold text-[#1C1B18] tabular-nums tracking-tight" data-testid="resumen-ingresos">{{ formatShort(resumen.totalIngresos) }}</p>
          </div>

          <div class="rounded-2xl p-4 bg-white border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)]" data-testid="card-gastado">
            <div class="flex items-center gap-2 mb-2.5">
              <div class="w-7 h-7 rounded-lg bg-[#FEF7E6] flex items-center justify-center">
                <ShoppingBag :size="14" class="text-[#C4870D]" />
              </div>
              <p class="text-xs font-medium text-[#9A9690]">Gastado</p>
            </div>
            <p class="text-xl lg:text-2xl font-bold text-[#1C1B18] tabular-nums tracking-tight" data-testid="resumen-gastado">{{ formatShort(resumen.totalGastado) }}</p>
          </div>

          <div class="rounded-2xl p-4 bg-white border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)]" data-testid="card-deudas">
            <div class="flex items-center gap-2 mb-2.5">
              <div class="w-7 h-7 rounded-lg bg-[#FEF1F0] flex items-center justify-center">
                <Clock :size="14" class="text-[#C05B52]" />
              </div>
              <p class="text-xs font-medium text-[#9A9690]">Cuota</p>
            </div>
            <p class="text-xl lg:text-2xl font-bold text-[#1C1B18] tabular-nums tracking-tight" data-testid="resumen-deudas">{{ formatShort(resumen.totalCuotaMensualDeudas) }}</p>
            <p class="text-[11px] text-[#9A9690] tabular-nums mt-0.5" data-testid="resumen-deudas-total">{{ formatShort(resumen.totalDeudas) }} total</p>
          </div>

          <div class="rounded-2xl p-4 bg-white border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)] col-span-2 lg:col-span-5" data-testid="card-tarjetas">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-[#F0F2FB] flex items-center justify-center">
                  <CreditCard :size="14" class="text-[#6B7FC4]" />
                </div>
                <p class="text-xs font-medium text-[#9A9690]">Tarjetas</p>
                <div class="inline-flex rounded-full bg-slate-100 p-0.5 text-[10px] font-semibold" role="tablist" aria-label="Modo de pago de tarjetas">
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="tarjetaPagoMode === 'total'"
                    class="px-2.5 py-1 rounded-full transition-colors"
                    :class="tarjetaPagoMode === 'total' ? 'bg-white text-[#356E6B] shadow-sm' : 'text-[#9A9690] hover:text-[#5A5854]'"
                    data-testid="tarjeta-mode-total"
                    @click="tarjetaPagoMode = 'total'"
                  >Pago del mes</button>
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="tarjetaPagoMode === 'minimo'"
                    class="px-2.5 py-1 rounded-full transition-colors"
                    :class="tarjetaPagoMode === 'minimo' ? 'bg-white text-[#356E6B] shadow-sm' : 'text-[#9A9690] hover:text-[#5A5854]'"
                    data-testid="tarjeta-mode-minimo"
                    @click="tarjetaPagoMode = 'minimo'"
                  >Mínimo</button>
                </div>
              </div>
              <p class="text-base lg:text-lg font-black text-slate-900 tabular-nums" data-testid="resumen-tarjetas">{{ formatCurrency(tarjetasCompromiso) }}</p>
            </div>
            <p
              v-if="tarjetaPagoMode === 'minimo' && totalArrastre > 0"
              class="text-[11px] text-rose-700 mt-2 tabular-nums"
              data-testid="tarjeta-arrastre"
            >
              Arrastrás <strong>{{ formatCurrency(totalArrastre) }}</strong> al próximo mes
            </p>
          </div>
        </div>

        <!-- Plan cierre + Donut -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div
            v-if="showCierreDeMes"
            class="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)]"
            data-testid="cierre-de-mes"
          >
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-base font-bold text-slate-900">Plan de cierre del mes</h2>
                <p class="text-xs text-slate-500 mt-0.5">Cómo vas llegando a fin de mes</p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1"
                :class="diferenciaGastos >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
              >
                <component :is="diferenciaGastos >= 0 ? CheckCircle2 : AlertTriangle" :size="12" />
                {{ diferenciaGastos >= 0 ? 'En control' : 'Revisar gastos' }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-5">
              <div class="bg-emerald-50/60 rounded-xl p-3">
                <p class="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">Ingresos</p>
                <p class="text-lg font-bold text-slate-900 tabular-nums">{{ formatShort(resumen.totalIngresos) }}</p>
              </div>
              <div class="bg-amber-50/60 rounded-xl p-3">
                <p class="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Fijo</p>
                <p class="text-lg font-bold text-slate-900 tabular-nums">{{ formatShort(compromisosFijos) }}</p>
              </div>
              <div
                class="rounded-xl p-3"
                :class="margenParaGastos >= 0 ? 'bg-indigo-50/60' : 'bg-red-50/60'"
              >
                <p
                  class="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                  :class="margenParaGastos >= 0 ? 'text-indigo-700' : 'text-red-700'"
                >Margen</p>
                <p class="text-lg font-bold text-slate-900 tabular-nums">{{ formatShort(Math.abs(margenParaGastos)) }}</p>
              </div>
            </div>

            <div class="mb-3">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-slate-600">
                  Gastaste <span class="font-semibold text-slate-900">{{ formatShort(resumen.totalGastado) }}</span>
                  de <span class="font-semibold text-slate-900">{{ formatShort(Math.max(margenParaGastos, 0)) }}</span>
                </span>
                <span class="font-bold tabular-nums" :class="porcentajeGastos > 100 ? 'text-[#C05B52]' : 'text-[#356E6B]'">
                  {{ porcentajeGastos }}%
                </span>
              </div>
              <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: barGastosWidth,
                    background: porcentajeGastos > 100
                      ? 'linear-gradient(90deg, #C05B52, #A04540)'
                      : 'linear-gradient(90deg, #4D9B97, #356E6B)',
                  }"
                ></div>
              </div>
            </div>

            <div
              class="flex items-start gap-2 mt-4 p-3 rounded-xl text-xs"
              :class="diferenciaGastos >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'"
            >
              <component :is="diferenciaGastos >= 0 ? CheckCircle2 : AlertTriangle" :size="14" class="shrink-0 mt-0.5" />
              <span v-if="diferenciaGastos >= 0">
                Te sobran <strong>{{ formatCurrency(diferenciaGastos) }}</strong> después de cubrir todo.
              </span>
              <span v-else>
                Necesitás reducir <strong>{{ formatCurrency(Math.abs(diferenciaGastos)) }}</strong> para llegar a fin de mes.
              </span>
            </div>
          </div>

          <div
            v-if="hasChartData"
            class="bg-white rounded-2xl p-6 border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)] flex flex-col"
          >
            <div class="mb-4">
              <h2 class="text-base font-bold text-slate-900">Distribución</h2>
              <p class="text-xs text-slate-500 mt-0.5">A qué va tu plata</p>
            </div>
            <div class="flex-1 flex flex-col items-center">
              <div class="w-full max-w-[180px] mb-4">
                <DoughnutChart
                  :labels="chartLabels"
                  :values="chartValues"
                  :colors="modernChartColors"
                  :center-value="formatShort(resumen.totalIngresos)"
                  center-label="ingresos"
                />
              </div>
              <ul class="w-full space-y-2">
                <li v-for="(label, i) in chartLabels" :key="label" class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: modernChartColors[i] }"></span>
                    <span class="text-slate-600">{{ label }}</span>
                  </div>
                  <span class="font-semibold text-slate-900 tabular-nums">{{ formatShort(chartValues[i] ?? 0) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Forecast tarjetas -->
        <div
          v-if="showForecastTarjetas"
          class="bg-white rounded-2xl p-6 border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)] mb-6"
          data-testid="forecast-tarjetas"
        >
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <CreditCard :size="20" class="text-rose-600" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Escenarios de tarjetas</h2>
              <p class="text-xs text-slate-500 mt-0.5">Tres caminos posibles este mes</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-xl border border-rose-100 bg-rose-50/30 p-4" data-testid="forecast-pago-total">
              <p class="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-2">Pago Completo</p>
              <p class="text-xl font-bold text-slate-900 tabular-nums mb-1">{{ formatCurrency(resumen.totalTarjetas) }}</p>
              <p class="text-[11px] text-slate-500 mb-3">Compromiso actual</p>
              <div class="flex items-center justify-between pt-3 border-t border-rose-100">
                <span class="text-[11px] text-slate-500">Balance</span>
                <span class="text-xs font-bold tabular-nums" :class="resumen.balance >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatCurrency(resumen.balance) }}
                </span>
              </div>
            </div>

            <div class="rounded-xl border border-amber-100 bg-amber-50/30 p-4" data-testid="forecast-pago-minimo">
              <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Solo Mínimos</p>
              <template v-if="totalPagoMinimo > 0">
                <p class="text-xl font-bold text-slate-900 tabular-nums mb-1">{{ formatCurrency(totalPagoMinimo) }}</p>
                <p class="text-[11px] text-slate-500 mb-3">
                  Ahorrás <span class="font-semibold text-emerald-600">{{ formatShort(ahorroPagoMinimo) }}</span>
                </p>
                <div class="flex items-center justify-between pt-3 border-t border-amber-100">
                  <span class="text-[11px] text-slate-500">Balance</span>
                  <span class="text-xs font-bold tabular-nums" :class="balancePagoMinimo >= 0 ? 'text-emerald-600' : 'text-red-600'">
                    {{ formatCurrency(balancePagoMinimo) }}
                  </span>
                </div>
              </template>
              <template v-else>
                <p class="text-xs text-slate-500 leading-relaxed mt-1">Definí pagos mínimos en tus tarjetas para activar este análisis.</p>
              </template>
            </div>

            <div
              v-if="resumen.totalCuotaMensualDeudas > 0"
              class="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4"
              data-testid="forecast-sin-deudas"
            >
              <p class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Sin Deudas</p>
              <p class="text-xl font-bold text-slate-900 tabular-nums mb-1">{{ formatCurrency(resumen.totalCuotaMensualDeudas) }}</p>
              <p class="text-[11px] text-slate-500 mb-3">Cuota que se libera</p>
              <div class="flex items-center justify-between pt-3 border-t border-emerald-100">
                <span class="text-[11px] text-slate-500">Balance</span>
                <span class="text-xs font-bold tabular-nums" :class="balanceSinDeudas >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatCurrency(balanceSinDeudas) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Transacciones -->
        <div class="bg-white rounded-2xl border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)] overflow-hidden">
          <!-- Header + Summary bar -->
          <div class="px-6 py-5 border-b border-slate-100">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-base font-bold text-slate-900">Transacciones</h2>
                <p class="text-xs text-slate-500 mt-0.5">Todo el movimiento del mes</p>
              </div>
              <span
                v-if="todasLasDescripciones.length > 0"
                class="bg-[#EBF5F5] text-[#356E6B] text-xs font-bold rounded-full px-3 py-1 tabular-nums"
              >
                {{ todasLasDescripciones.length }} movimientos
              </span>
            </div>

            <!-- Net flow bar (visual summary) -->
            <div v-if="todasLasDescripciones.length > 0" class="mb-4">
              <div class="flex items-center justify-between text-[11px] mb-1.5">
                <span class="text-slate-500">
                  Entra <span class="font-semibold text-emerald-600 tabular-nums">{{ formatShort(resumen.totalIngresos) }}</span>
                  · Sale <span class="font-semibold text-rose-600 tabular-nums">{{ formatShort(totalSalidasMes) }}</span>
                </span>
                <span class="font-semibold tabular-nums" :class="netoMes >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  Neto {{ netoMes >= 0 ? '+' : '−' }}{{ formatShort(Math.abs(netoMes)) }}
                </span>
              </div>
              <div class="flex h-1.5 rounded-full overflow-hidden bg-slate-100" aria-hidden="true">
                <div
                  class="bg-emerald-500"
                  :style="{ width: (resumen.totalIngresos / Math.max(resumen.totalIngresos + totalSalidasMes, 1) * 100) + '%' }"
                ></div>
                <div
                  class="bg-orange-500"
                  :style="{ width: (resumen.totalGastado / Math.max(resumen.totalIngresos + totalSalidasMes, 1) * 100) + '%' }"
                ></div>
                <div
                  class="bg-amber-500"
                  :style="{ width: (resumen.totalCuotaMensualDeudas / Math.max(resumen.totalIngresos + totalSalidasMes, 1) * 100) + '%' }"
                ></div>
                <div
                  class="bg-rose-500"
                  :style="{ width: (resumen.totalTarjetas / Math.max(resumen.totalIngresos + totalSalidasMes, 1) * 100) + '%' }"
                ></div>
              </div>
            </div>

            <!-- Filter tabs + search + sort -->
            <div v-if="todasLasDescripciones.length > 0" class="flex flex-col lg:flex-row gap-3">
              <div class="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide">
                <button
                  v-for="tab in filterTabs"
                  :key="tab.key"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap"
                  :class="activeFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                  :style="activeFilter === tab.key ? { color: tab.color } : {}"
                  @click="activeFilter = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div class="flex gap-2 lg:ml-auto">
                <div class="relative flex-1 lg:flex-none lg:w-56">
                  <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Buscar transacción..."
                    class="w-full pl-9 pr-8 py-2 text-xs bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D9B97]/30 focus:border-[#4D9B97] focus:bg-white transition-all"
                  />
                  <button
                    v-if="searchQuery"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                    @click="searchQuery = ''"
                    aria-label="Limpiar búsqueda"
                  >
                    <X :size="12" />
                  </button>
                </div>
                <button
                  class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  :title="sortDesc ? 'Mayor a menor' : 'Menor a mayor'"
                  @click="sortDesc = !sortDesc"
                >
                  <ArrowUpDown :size="12" />
                  {{ sortDesc ? 'Mayor' : 'Menor' }}
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="todasLasDescripciones.length === 0"
            class="flex flex-col items-center justify-center py-16 px-5 text-center"
            data-testid="descriptions-empty"
          >
            <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <Inbox :size="24" class="text-slate-400" />
            </div>
            <p class="text-sm font-semibold text-slate-900">Sin transacciones</p>
            <p class="text-xs text-slate-500 mt-1">Registrá ingresos o gastos para verlos acá.</p>
          </div>

          <!-- Flat filtered view (when filter or search active) -->
          <div v-else-if="hasActiveFilterOrSearch" data-testid="descriptions-list">
            <div
              v-if="filteredFlatItems.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2">
                <Search :size="20" class="text-slate-400" />
              </div>
              <p class="text-sm font-semibold text-slate-700">Sin resultados</p>
              <p class="text-xs text-slate-500 mt-1">Probá con otro término o filtro</p>
            </div>
            <div v-else class="divide-y divide-slate-50">
              <div
                v-for="(item, idx) in filteredFlatItems"
                :key="'flat-' + idx"
                class="group relative flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors"
                data-testid="description-item"
              >
                <span
                  class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                  :style="{ backgroundColor: colorFor(item.tipo) }"
                ></span>
                <div class="flex-1 min-w-0 ml-1">
                  <div class="flex items-center gap-2 mb-1">
                    <p class="text-sm font-semibold text-slate-900 truncate leading-tight">{{ item.descripcion }}</p>
                    <span
                      class="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
                      :style="{ backgroundColor: colorFor(item.tipo) + '1A', color: colorFor(item.tipo) }"
                      data-testid="description-type"
                    >
                      {{ item.tipo }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[160px]">
                      <div
                        class="h-full rounded-full transition-all"
                        :style="{ width: percentOfGroup(item.monto, item.tipo) + '%', backgroundColor: colorFor(item.tipo) }"
                      ></div>
                    </div>
                    <span class="text-[10px] text-slate-400 tabular-nums">{{ percentOfGroup(item.monto, item.tipo) }}%</span>
                  </div>
                </div>
                <p class="text-sm font-bold shrink-0 tabular-nums" :style="{ color: colorFor(item.tipo) }" data-testid="description-monto">
                  {{ signFor(item.tipo) }}{{ formatCurrency(item.monto) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Grouped view (default) -->
          <div v-else data-testid="descriptions-list">
            <template v-for="group in transactionGroups" :key="group.key">
              <div
                v-if="group.items.length > 0"
                class="border-b border-slate-100 last:border-0"
              >
                <button
                  class="flex items-center justify-between w-full px-6 py-3.5 hover:bg-slate-50/60 transition-colors sticky top-0 bg-white/95 backdrop-blur-sm z-[1]"
                  @click="toggleGroup(group.key)"
                >
                  <div class="flex items-center gap-2.5">
                    <span
                      class="inline-flex items-center text-[11px] font-bold rounded-full px-2.5 py-0.5"
                      :style="{ backgroundColor: group.color + '1A', color: group.color }"
                    >
                      {{ group.label }}
                    </span>
                    <span class="text-xs text-slate-400">{{ group.items.length }} mov.</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-bold tabular-nums" :style="{ color: group.color }">
                      {{ group.sign }}{{ formatShort(group.total) }}
                    </span>
                    <component :is="group.open ? ChevronUp : ChevronDown" :size="14" class="text-slate-400" />
                  </div>
                </button>
                <div v-if="group.open" class="divide-y divide-slate-50">
                  <div
                    v-for="(item, idx) in [...group.items].sort((a, b) => sortDesc ? b.monto - a.monto : a.monto - b.monto)"
                    :key="group.key + '-' + idx"
                    class="group relative flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors"
                    data-testid="description-item"
                  >
                    <span
                      class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                      :style="{ backgroundColor: group.color }"
                    ></span>
                    <div class="flex-1 min-w-0 ml-1">
                      <p class="text-sm font-semibold text-slate-900 truncate leading-tight mb-1">{{ item.descripcion }}</p>
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                          <div
                            class="h-full rounded-full transition-all"
                            :style="{ width: percentOfGroup(item.monto, item.tipo) + '%', backgroundColor: group.color }"
                          ></div>
                        </div>
                        <span class="text-[10px] text-slate-400 tabular-nums">{{ percentOfGroup(item.monto, item.tipo) }}%</span>
                        <span class="text-[10px] text-slate-400 hidden sm:inline" data-testid="description-type">{{ item.tipo }}</span>
                      </div>
                    </div>
                    <p class="text-sm font-bold shrink-0 tabular-nums" :style="{ color: group.color }" data-testid="description-monto">
                      {{ group.sign }}{{ formatCurrency(item.monto) }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
