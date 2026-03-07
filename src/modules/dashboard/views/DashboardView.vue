<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TrendingUp,
  TrendingDown,
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
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { useDashboard } from '../composables/useDashboard'
import DoughnutChart from '~/shared/components/charts/DoughnutChart.vue'
import OnboardingModal from '~/modules/demo/components/OnboardingModal.vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const showOnboarding = ref(
  auth.currentUser?.provider === 'demo' && !localStorage.getItem('monei_demo_onboarding_done'),
)
const { resumen, todasLasDescripciones, totalPagoMinimo, lineaTotalCombinada, isLoading } = useDashboard()

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
  Ingreso: { hex: '#3E6F73', icon: TrendingUp },
  Gasto: { hex: '#C65A3A', icon: ShoppingBag },
  Deuda: { hex: '#D4A017', icon: Clock },
  Tarjeta: { hex: '#6A1E2D', icon: CreditCard },
}

const statsCards = computed(() => [
  {
    label: 'Total Ingresos',
    value: resumen.value.totalIngresos,
    icon: TrendingUp,
    color: '#3E6F73',
    bgColor: 'rgba(62,111,115,0.10)',
    testid: 'card-ingresos',
    valueTestid: 'resumen-ingresos',
  },
  {
    label: 'Total Gastado',
    value: resumen.value.totalGastado,
    icon: ShoppingBag,
    color: '#C65A3A',
    bgColor: 'rgba(198,90,58,0.10)',
    testid: 'card-gastado',
    valueTestid: 'resumen-gastado',
  },
  {
    label: 'Cuota Mensual',
    value: resumen.value.totalCuotaMensualDeudas,
    icon: Clock,
    color: '#D4A017',
    bgColor: 'rgba(212,160,23,0.10)',
    testid: 'card-deudas',
    valueTestid: 'resumen-deudas',
  },
  {
    label: 'Tarjetas Crédito',
    value: resumen.value.totalTarjetas,
    icon: CreditCard,
    color: '#6A1E2D',
    bgColor: 'rgba(106,30,45,0.08)',
    testid: 'card-tarjetas',
    valueTestid: 'resumen-tarjetas',
  },
])

const compromisosFijos = computed(() => resumen.value.totalCuotaMensualDeudas + resumen.value.totalTarjetas)
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
const capacidadLibreSinDeudas = computed(() => resumen.value.totalIngresos - resumen.value.totalGastado)

const isPositive = computed(() => resumen.value.balance >= 0)
const balanceGradient = computed(() =>
  isPositive.value
    ? 'linear-gradient(135deg, #3E6F73 0%, #2C5558 100%)'
    : 'linear-gradient(135deg, #C65A3A 0%, #9A3D27 100%)',
)
const balanceIcon = computed(() => (isPositive.value ? TrendingUp : TrendingDown))

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
const chartColors = ['#3E6F73', '#C65A3A', '#D4A017', '#6A1E2D']
</script>

<template>
  <div class="min-h-screen bg-[#F0F2F5]" data-testid="dashboard-view">
    <OnboardingModal v-if="showOnboarding" @close="showOnboarding = false" />
    <div class="max-w-6xl mx-auto p-5 lg:p-8 space-y-5">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs text-[#94A3B8] capitalize mb-1">{{ todayDate }}</p>
          <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">
            Hola, {{ auth.currentUser?.displayName ?? 'Usuario' }} 👋
          </h1>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-3 py-24 text-[#94A3B8]"
        data-testid="loading-state"
      >
        <Loader2 :size="28" class="animate-spin" aria-hidden="true" />
        <span class="text-sm">Cargando tu resumen...</span>
      </div>

      <template v-else>
        <div
          class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
          :style="{ background: balanceGradient }"
          data-testid="card-balance"
        >
          <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.08]" style="background: white"></div>
          <div
            class="absolute -bottom-16 -left-8 w-56 h-56 rounded-full opacity-[0.06]"
            style="background: white"
          ></div>

          <div class="relative z-10 flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-white/60 text-xs font-semibold uppercase tracking-widest"> Balance Neto </span>
                <span
                  class="inline-flex items-center gap-0.5 text-xs font-bold rounded-full px-2.5 py-0.5"
                  :class="isPositive ? 'bg-white/20 text-white' : 'bg-white/20 text-white'"
                >
                  <component :is="isPositive ? ArrowUpRight : ArrowDownRight" :size="12" />
                  {{ isPositive ? 'Positivo' : 'Negativo' }}
                </span>
              </div>

              <p class="text-white text-4xl lg:text-5xl font-black tracking-tight" data-testid="resumen-balance">
                {{ formatCurrency(resumen.balance) }}
              </p>

              <div class="flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/20">
                <div>
                  <p class="text-white/50 text-xs mb-0.5">Ingresos</p>
                  <p class="text-white font-bold text-sm">{{ formatShort(resumen.totalIngresos) }}</p>
                </div>
                <div>
                  <p class="text-white/50 text-xs mb-0.5">Gastado</p>
                  <p class="text-white font-bold text-sm">{{ formatShort(resumen.totalGastado) }}</p>
                </div>
                <div>
                  <p class="text-white/50 text-xs mb-0.5">Cuota mensual</p>
                  <p class="text-white font-bold text-sm">{{ formatShort(resumen.totalCuotaMensualDeudas) }}</p>
                </div>
                <div>
                  <p class="text-white/50 text-xs mb-0.5">Deuda bruto</p>
                  <p class="text-white font-bold text-sm" data-testid="resumen-deudas-total">
                    {{ formatCurrency(resumen.totalDeudas) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
              <component :is="balanceIcon" :size="32" class="text-white" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="card in statsCards"
            :key="card.testid"
            class="rounded-2xl p-5 shadow-sm relative overflow-hidden"
            :style="{ backgroundColor: card.bgColor }"
            :data-testid="card.testid"
          >
            <div
              class="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
              :style="{ backgroundColor: card.color }"
            ></div>

            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <component :is="card.icon" :size="22" :style="{ color: card.color }" aria-hidden="true" />
                <p
                  class="text-xs font-semibold text-right leading-tight max-w-[60%]"
                  :style="{ color: card.color + 'CC' }"
                >
                  {{ card.label }}
                </p>
              </div>
              <p class="text-xl lg:text-2xl font-black" :style="{ color: card.color }" :data-testid="card.valueTestid">
                {{ formatCurrency(card.value) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="showCierreDeMes"
          class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm p-5"
          data-testid="cierre-de-mes"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-[#1A1A2E]">Plan de cierre de mes</h2>
            <span
              class="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1"
              :class="
                diferenciaGastos >= 0
                  ? 'bg-[rgba(62,111,115,0.10)] text-[#3E6F73]'
                  : 'bg-[rgba(198,90,58,0.10)] text-[#C65A3A]'
              "
            >
              <component :is="diferenciaGastos >= 0 ? CheckCircle2 : AlertTriangle" :size="12" aria-hidden="true" />
              {{ diferenciaGastos >= 0 ? 'En control' : 'Revisar gastos' }}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-[rgba(62,111,115,0.08)]">
              <p class="text-[10px] font-semibold text-[#3E6F73] uppercase tracking-wide mb-1">Ingresos</p>
              <p class="text-base font-black text-[#3E6F73]">{{ formatShort(resumen.totalIngresos) }}</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-[rgba(212,160,23,0.08)]">
              <p class="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wide mb-1">Compromisos</p>
              <p class="text-base font-black text-[#D4A017]">{{ formatShort(compromisosFijos) }}</p>
              <p class="text-[10px] text-[#94A3B8] mt-0.5">Deudas + Tarjetas</p>
            </div>
            <div
              class="text-center p-3 rounded-xl"
              :class="margenParaGastos >= 0 ? 'bg-[rgba(62,111,115,0.08)]' : 'bg-[rgba(198,90,58,0.08)]'"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-wide mb-1"
                :class="margenParaGastos >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'"
              >
                Margen
              </p>
              <p class="text-base font-black" :class="margenParaGastos >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'">
                {{ formatShort(Math.abs(margenParaGastos)) }}
              </p>
              <p class="text-[10px] text-[#94A3B8] mt-0.5">para gastos</p>
            </div>
          </div>

          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-[#64748B]">
                Gastos
                <span class="font-semibold text-[#1A1A2E]">{{ formatShort(resumen.totalGastado) }}</span>
                de
                <span class="font-semibold text-[#1A1A2E]">{{ formatShort(Math.max(margenParaGastos, 0)) }}</span>
                disponibles
              </span>
              <span class="text-xs font-bold" :class="porcentajeGastos > 100 ? 'text-[#C65A3A]' : 'text-[#3E6F73]'"
                >{{ porcentajeGastos }}%</span
              >
            </div>
            <div class="h-2.5 rounded-full bg-[#F0F2F5] overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :style="{
                  width: barGastosWidth,
                  backgroundColor: porcentajeGastos > 100 ? '#C65A3A' : '#3E6F73',
                }"
              ></div>
            </div>
          </div>

          <div
            class="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold"
            :class="
              diferenciaGastos >= 0
                ? 'bg-[rgba(62,111,115,0.08)] text-[#3E6F73]'
                : 'bg-[rgba(198,90,58,0.08)] text-[#C65A3A]'
            "
          >
            <component
              :is="diferenciaGastos >= 0 ? CheckCircle2 : AlertTriangle"
              :size="14"
              class="shrink-0"
              aria-hidden="true"
            />
            <span v-if="diferenciaGastos >= 0">
              Te sobran <strong>{{ formatCurrency(diferenciaGastos) }}</strong> después de cubrir todos tus compromisos
              y gastos.
            </span>
            <span v-else>
              Necesitas reducir <strong>{{ formatCurrency(Math.abs(diferenciaGastos)) }}</strong> en gastos para llegar
              a fin de mes.
            </span>
          </div>
        </div>

        <div
          v-if="showForecastTarjetas"
          class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm p-5"
          data-testid="forecast-tarjetas"
        >
          <div class="flex items-center gap-2 mb-4">
            <CreditCard :size="16" style="color: #6a1e2d" aria-hidden="true" />
            <h2 class="text-sm font-bold text-[#1A1A2E]">Pronóstico Tarjetas de Crédito</h2>
          </div>

          <div
            class="grid gap-3"
            :class="resumen.totalCuotaMensualDeudas > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'"
          >
            <div class="rounded-xl border border-[#EEEEF0] p-4" data-testid="forecast-pago-total">
              <p class="text-[10px] font-semibold text-[#6A1E2D] uppercase tracking-wide mb-2">Pago Completo</p>
              <p class="text-lg font-black text-[#6A1E2D] mb-1">{{ formatCurrency(resumen.totalTarjetas) }}</p>
              <p class="text-[10px] text-[#94A3B8] mb-3">Compromiso mensual actual</p>
              <div class="flex items-center justify-between pt-3 border-t border-[#F0F2F5]">
                <span class="text-[10px] text-[#94A3B8]">Balance resultante</span>
                <span class="text-xs font-bold" :class="resumen.balance >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'">{{
                  formatCurrency(resumen.balance)
                }}</span>
              </div>
            </div>

            <div class="rounded-xl border border-[#EEEEF0] p-4" data-testid="forecast-pago-minimo">
              <p class="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wide mb-2">Solo Mínimos</p>
              <template v-if="totalPagoMinimo > 0">
                <p class="text-lg font-black text-[#D4A017] mb-1">{{ formatCurrency(totalPagoMinimo) }}</p>
                <p class="text-[10px] text-[#94A3B8] mb-3">
                  Ahorras
                  <span class="font-bold text-[#3E6F73]">{{ formatCurrency(ahorroPagoMinimo) }}</span>
                  vs pago total
                </p>
                <div class="flex items-center justify-between pt-3 border-t border-[#F0F2F5]">
                  <span class="text-[10px] text-[#94A3B8]">Balance resultante</span>
                  <span
                    class="text-xs font-bold"
                    :class="balancePagoMinimo >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'"
                    >{{ formatCurrency(balancePagoMinimo) }}</span
                  >
                </div>
              </template>
              <template v-else>
                <p class="text-xs text-[#94A3B8] leading-relaxed mt-1">
                  Define pagos mínimos en tus tarjetas para activar este análisis.
                </p>
              </template>
            </div>

            <div
              v-if="resumen.totalCuotaMensualDeudas > 0"
              class="rounded-xl border border-[#EEEEF0] p-4"
              data-testid="forecast-sin-deudas"
            >
              <p class="text-[10px] font-semibold text-[#3E6F73] uppercase tracking-wide mb-2">Sin Deudas</p>
              <p class="text-lg font-black text-[#3E6F73] mb-1">
                {{ formatCurrency(resumen.totalCuotaMensualDeudas) }}
              </p>
              <p class="text-[10px] text-[#94A3B8] mb-3">Cuota mensual que se libera</p>
              <div class="space-y-2 pt-3 border-t border-[#F0F2F5]">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-[#94A3B8]">Balance proyectado</span>
                  <span
                    class="text-xs font-bold"
                    :class="balanceSinDeudas >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'"
                    >{{ formatCurrency(balanceSinDeudas) }}</span
                  >
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-[#94A3B8]">Capacidad libre</span>
                  <span
                    class="text-xs font-bold"
                    :class="capacidadLibreSinDeudas >= 0 ? 'text-[#3E6F73]' : 'text-[#C65A3A]'"
                    >{{ formatCurrency(capacidadLibreSinDeudas) }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="lineaTotalCombinada > 0"
            class="flex items-center gap-2 mt-4 p-3 rounded-xl bg-[rgba(106,30,45,0.06)] text-xs text-[#6A1E2D]"
          >
            <CreditCard :size="14" class="shrink-0" aria-hidden="true" />
            <span>
              Línea de crédito combinada:
              <strong>{{ formatCurrency(lineaTotalCombinada) }}</strong>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div v-if="hasChartData" class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm p-5">
            <h2 class="text-sm font-bold text-[#1A1A2E] mb-5">Distribución</h2>
            <div class="w-40 mx-auto mb-5">
              <DoughnutChart
                :labels="chartLabels"
                :values="chartValues"
                :colors="chartColors"
                :center-value="formatShort(resumen.totalIngresos)"
                center-label="ingresos"
              />
            </div>
            <ul class="space-y-2.5">
              <li v-for="(label, i) in chartLabels" :key="label" class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <div
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: chartColors[i] }"
                    aria-hidden="true"
                  ></div>
                  <span class="text-[#64748B]">{{ label }}</span>
                </div>
                <span class="font-bold text-[#1A1A2E]">{{ formatShort(chartValues[i] ?? 0) }}</span>
              </li>
            </ul>
          </div>

          <div
            class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm overflow-hidden"
            :class="hasChartData ? 'lg:col-span-2' : 'lg:col-span-3'"
          >
            <div class="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
              <h2 class="text-sm font-bold text-[#1A1A2E]">Transacciones Recientes</h2>
              <span
                v-if="todasLasDescripciones.length > 0"
                class="bg-[#F0F2F5] text-[#64748B] text-xs font-semibold rounded-full px-2.5 py-0.5"
              >
                {{ todasLasDescripciones.length }}
              </span>
            </div>

            <div
              v-if="todasLasDescripciones.length === 0"
              class="flex flex-col items-center justify-center py-14 px-5 text-center"
              data-testid="descriptions-empty"
            >
              <div class="w-14 h-14 rounded-2xl bg-[#F0F2F5] flex items-center justify-center mb-3">
                <Inbox :size="26" class="text-[#94A3B8]" aria-hidden="true" />
              </div>
              <p class="text-sm font-semibold text-[#1A1A2E]">Sin transacciones</p>
              <p class="text-xs text-[#94A3B8] mt-1 max-w-50">Registra ingresos o gastos para verlos aquí</p>
            </div>

            <div v-else data-testid="descriptions-list">
              <div v-if="ingresosItems.length > 0" class="border-b border-[#F0F2F5]">
                <button
                  class="flex items-center justify-between w-full px-5 py-3 hover:bg-[#F8F9FB] transition-colors"
                  @click="ingresosSectionOpen = !ingresosSectionOpen"
                >
                  <div class="flex items-center gap-2">
                    <TrendingUp :size="14" style="color: #3e6f73" aria-hidden="true" />
                    <span class="text-xs font-bold" style="color: #3e6f73">Ingresos</span>
                    <span class="text-xs bg-[#F0F2F5] text-[#64748B] rounded-full px-2 py-0.5 font-semibold">
                      {{ ingresosItems.length }}
                    </span>
                    <span class="text-xs font-bold tabular-nums" style="color: #3e6f73">{{
                      formatShort(resumen.totalIngresos)
                    }}</span>
                  </div>
                  <component
                    :is="ingresosSectionOpen ? ChevronUp : ChevronDown"
                    :size="14"
                    class="text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </button>
                <div v-if="ingresosSectionOpen" class="divide-y divide-[#F0F2F5]">
                  <div
                    v-for="(item, index) in ingresosItems"
                    :key="'i-' + index"
                    class="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8F9FB] transition-colors cursor-default"
                    data-testid="description-item"
                  >
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      :style="{ backgroundColor: (typeConfig[item.tipo]?.hex ?? '#64748B') + '15' }"
                    >
                      <component
                        :is="typeConfig[item.tipo]?.icon"
                        :size="18"
                        :style="{ color: typeConfig[item.tipo]?.hex ?? '#64748B' }"
                        aria-hidden="true"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#1A1A2E] truncate leading-tight">{{ item.descripcion }}</p>
                      <span
                        class="text-xs font-medium"
                        :style="{ color: typeConfig[item.tipo]?.hex ?? '#64748B' }"
                        data-testid="description-type"
                        >{{ item.tipo }}</span
                      >
                    </div>
                    <p
                      class="text-sm font-bold shrink-0 tabular-nums"
                      style="color: #3e6f73"
                      data-testid="description-monto"
                    >
                      +{{ formatCurrency(item.monto) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="gastosItems.length > 0" class="border-b border-[#F0F2F5]">
                <button
                  class="flex items-center justify-between w-full px-5 py-3 hover:bg-[#F8F9FB] transition-colors"
                  @click="gastosSectionOpen = !gastosSectionOpen"
                >
                  <div class="flex items-center gap-2">
                    <TrendingDown :size="14" style="color: #c65a3a" aria-hidden="true" />
                    <span class="text-xs font-bold" style="color: #c65a3a">Gastos</span>
                    <span class="text-xs bg-[#F0F2F5] text-[#64748B] rounded-full px-2 py-0.5 font-semibold">
                      {{ gastosItems.length }}
                    </span>
                    <span class="text-xs font-bold tabular-nums" style="color: #c65a3a">{{
                      formatShort(resumen.totalGastado)
                    }}</span>
                  </div>
                  <component
                    :is="gastosSectionOpen ? ChevronUp : ChevronDown"
                    :size="14"
                    class="text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </button>
                <div v-if="gastosSectionOpen" class="divide-y divide-[#F0F2F5]">
                  <div
                    v-for="(item, index) in gastosItems"
                    :key="'g-' + index"
                    class="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8F9FB] transition-colors cursor-default"
                    data-testid="description-item"
                  >
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      :style="{ backgroundColor: (typeConfig[item.tipo]?.hex ?? '#64748B') + '15' }"
                    >
                      <component
                        :is="typeConfig[item.tipo]?.icon"
                        :size="18"
                        :style="{ color: typeConfig[item.tipo]?.hex ?? '#64748B' }"
                        aria-hidden="true"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#1A1A2E] truncate leading-tight">{{ item.descripcion }}</p>
                      <span
                        class="text-xs font-medium"
                        :style="{ color: typeConfig[item.tipo]?.hex ?? '#64748B' }"
                        data-testid="description-type"
                        >{{ item.tipo }}</span
                      >
                    </div>
                    <p
                      class="text-sm font-bold shrink-0 tabular-nums"
                      style="color: #c65a3a"
                      data-testid="description-monto"
                    >
                      −{{ formatCurrency(item.monto) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="deudasItems.length > 0" class="border-b border-[#F0F2F5]">
                <button
                  class="flex items-center justify-between w-full px-5 py-3 hover:bg-[#F8F9FB] transition-colors"
                  @click="deudasSectionOpen = !deudasSectionOpen"
                >
                  <div class="flex items-center gap-2">
                    <Clock :size="14" style="color: #d4a017" aria-hidden="true" />
                    <span class="text-xs font-bold" style="color: #d4a017">Deudas</span>
                    <span class="text-xs bg-[#F0F2F5] text-[#64748B] rounded-full px-2 py-0.5 font-semibold">
                      {{ deudasItems.length }}
                    </span>
                    <span class="text-xs font-bold tabular-nums" style="color: #d4a017">{{
                      formatShort(resumen.totalCuotaMensualDeudas)
                    }}</span>
                  </div>
                  <component
                    :is="deudasSectionOpen ? ChevronUp : ChevronDown"
                    :size="14"
                    class="text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </button>
                <div v-if="deudasSectionOpen" class="divide-y divide-[#F0F2F5]">
                  <div
                    v-for="(item, index) in deudasItems"
                    :key="'d-' + index"
                    class="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8F9FB] transition-colors cursor-default"
                    data-testid="description-item"
                  >
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style="background-color: rgba(212, 160, 23, 0.12)"
                    >
                      <Clock :size="18" style="color: #d4a017" aria-hidden="true" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#1A1A2E] truncate leading-tight">{{ item.descripcion }}</p>
                      <span class="text-xs font-medium" style="color: #d4a017" data-testid="description-type">{{
                        item.tipo
                      }}</span>
                    </div>
                    <p
                      class="text-sm font-bold shrink-0 tabular-nums"
                      style="color: #d4a017"
                      data-testid="description-monto"
                    >
                      −{{ formatCurrency(item.monto) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="tarjetasItems.length > 0">
                <button
                  class="flex items-center justify-between w-full px-5 py-3 hover:bg-[#F8F9FB] transition-colors"
                  @click="tarjetasSectionOpen = !tarjetasSectionOpen"
                >
                  <div class="flex items-center gap-2">
                    <CreditCard :size="14" style="color: #6a1e2d" aria-hidden="true" />
                    <span class="text-xs font-bold" style="color: #6a1e2d">Tarjetas</span>
                    <span class="text-xs bg-[#F0F2F5] text-[#64748B] rounded-full px-2 py-0.5 font-semibold">
                      {{ tarjetasItems.length }}
                    </span>
                    <span class="text-xs font-bold tabular-nums" style="color: #6a1e2d">{{
                      formatShort(resumen.totalTarjetas)
                    }}</span>
                  </div>
                  <component
                    :is="tarjetasSectionOpen ? ChevronUp : ChevronDown"
                    :size="14"
                    class="text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </button>
                <div v-if="tarjetasSectionOpen" class="divide-y divide-[#F0F2F5]">
                  <div
                    v-for="(item, index) in tarjetasItems"
                    :key="'t-' + index"
                    class="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8F9FB] transition-colors cursor-default"
                    data-testid="description-item"
                  >
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style="background-color: rgba(106, 30, 45, 0.1)"
                    >
                      <CreditCard :size="18" style="color: #6a1e2d" aria-hidden="true" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#1A1A2E] truncate leading-tight">{{ item.descripcion }}</p>
                      <span class="text-xs font-medium" style="color: #6a1e2d" data-testid="description-type">{{
                        item.tipo
                      }}</span>
                    </div>
                    <p
                      class="text-sm font-bold shrink-0 tabular-nums"
                      style="color: #6a1e2d"
                      data-testid="description-monto"
                    >
                      −{{ formatCurrency(item.monto) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
