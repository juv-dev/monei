<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  ShoppingBag,
  Clock,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-vue-next'
import { useDashboard } from '../composables/useDashboard'
import OnboardingModal from '~/modules/demo/components/OnboardingModal.vue'
import { useAuthStore } from '~/stores/auth'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'
import { useDragScroll } from '~/shared/composables/useDragScroll'
import type { DescripcionResumen, TarjetaCredito } from '~/shared/types'

const auth = useAuthStore()
const showOnboarding = ref(
  auth.currentUser?.provider === 'demo' && !localStorage.getItem('monei_demo_onboarding_done'),
)

const { resumen, todasLasDescripciones, totalPagoMinimo, totalPagoMes, isLoading } = useDashboard()
const { tarjetas } = useTarjetas()
const { monthLabel, isCurrentMonth, prevMonth, nextMonth } = useSelectedMonth()

const tarjetasScrollRef = ref<HTMLElement | null>(null)
const chipsScrollRef = ref<HTMLElement | null>(null)
useDragScroll(tarjetasScrollRef)
useDragScroll(chipsScrollRef)

const userName = computed(() => auth.currentUser?.displayName?.split(' ')[0] ?? 'Usuario')
const userInitial = computed(() => (auth.currentUser?.displayName?.charAt(0) ?? 'U').toUpperCase())

const todayDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
}).format(new Date())

const TARJETA_MODE_KEY = 'monei_tarjeta_pago_mode'
const tarjetaPagoMode = ref<'total' | 'minimo'>(
  (localStorage.getItem(TARJETA_MODE_KEY) as 'total' | 'minimo' | null) ?? 'total',
)
watch(tarjetaPagoMode, (v) => localStorage.setItem(TARJETA_MODE_KEY, v))
const isMinimo = computed(() => tarjetaPagoMode.value === 'minimo')

const tarjetasCompromiso = computed(() =>
  isMinimo.value ? totalPagoMinimo.value : totalPagoMes.value,
)
const compromisosFijos = computed(
  () => resumen.value.totalCuotaMensualDeudas + tarjetasCompromiso.value,
)
const balanceNeto = computed(
  () => resumen.value.totalIngresos - resumen.value.totalGastado - compromisosFijos.value,
)
const isPositive = computed(() => balanceNeto.value >= 0)
const totalSalidas = computed(() => resumen.value.totalGastado + compromisosFijos.value)
const inflowWidth = computed(() => {
  const denom = resumen.value.totalIngresos + totalSalidas.value
  return denom > 0 ? Math.round((resumen.value.totalIngresos / denom) * 100) + '%' : '50%'
})

const margenParaGastos = computed(() => resumen.value.totalIngresos - compromisosFijos.value)
const diferenciaGastos = computed(() => margenParaGastos.value - resumen.value.totalGastado)
const porcentajeGastos = computed(() =>
  margenParaGastos.value > 0
    ? Math.round((resumen.value.totalGastado / margenParaGastos.value) * 100)
    : resumen.value.totalGastado > 0
      ? 999
      : 0,
)
const planOk = computed(() => diferenciaGastos.value >= 0)
const barGastosWidth = computed(() => Math.min(porcentajeGastos.value, 100) + '%')
const showCierreDeMes = computed(
  () => resumen.value.totalIngresos > 0 || compromisosFijos.value > 0,
)

function fmt(n: number): string {
  return 'S/ ' + Math.round(Math.abs(n)).toLocaleString('es-PE')
}
function fmtShort(n: number): string {
  const v = Math.abs(n)
  if (v >= 1_000_000) return `S/ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `S/ ${(v / 1000).toFixed(1)}k`
  return 'S/ ' + Math.round(v).toLocaleString('es-PE')
}

const balanceStr = computed(() => (isPositive.value ? '' : '−') + fmt(balanceNeto.value))
const heroSubtitle = computed(() =>
  isPositive.value
    ? 'Te queda margen después de cubrir todo'
    : 'Tus compromisos superan tus ingresos',
)
const planNoteText = computed(() =>
  planOk.value
    ? `Te sobran ${fmt(diferenciaGastos.value)} después de cubrir gastos, deudas y tarjetas.`
    : `Necesitás recortar ${fmt(Math.abs(diferenciaGastos.value))} para cerrar el mes en azul.`,
)

const donut = computed(() => {
  const income = resumen.value.totalIngresos
  const gasto = resumen.value.totalGastado
  const deuda = resumen.value.totalCuotaMensualDeudas
  const tarj = tarjetasCompromiso.value
  const denom = Math.max(income, gasto + deuda + tarj)
  const disponible = Math.max(balanceNeto.value, 0)
  if (denom <= 0) return { bg: '#F0EBE0', disponible }
  const a = (gasto / denom) * 100
  const b = a + (deuda / denom) * 100
  const c = b + (tarj / denom) * 100
  const dispPart = isPositive.value ? disponible : 0
  const d = c + (dispPart / denom) * 100
  const bg = `conic-gradient(#D98A3D 0 ${a}%, #B8893A ${a}% ${b}%, #C25A4E ${b}% ${c}%, #1E9E6A ${c}% ${d}%, #F0EBE0 ${d}% 100%)`
  return { bg, disponible }
})

const donutLegend = computed(() => [
  { label: 'Gastos', color: '#D98A3D', value: resumen.value.totalGastado },
  { label: 'Deudas', color: '#B8893A', value: resumen.value.totalCuotaMensualDeudas },
  { label: 'Tarjetas', color: '#C25A4E', value: tarjetasCompromiso.value },
  { label: 'Disponible', color: '#1E9E6A', value: donut.value.disponible },
])

const cardGrads = [
  'linear-gradient(145deg,#1F4A45 0%,#0F2B28 100%)',
  'linear-gradient(145deg,#3A332A 0%,#211C16 100%)',
  'linear-gradient(145deg,#1C3357 0%,#0E1C32 100%)',
]
const cardOrbs = [
  'radial-gradient(circle,rgba(95,208,168,.25),transparent 70%)',
  'radial-gradient(circle,rgba(200,170,114,.22),transparent 70%)',
  'radial-gradient(circle,rgba(120,160,220,.25),transparent 70%)',
]

function tarjetaView(t: TarjetaCredito, i: number) {
  const usd = (t.montoDeudaActualUsd ?? 0) > 0 || (t.lineaTotalUsd ?? 0) > 0
  const sym = usd ? '$' : 'S/'
  const pay = isMinimo.value
    ? usd
      ? (t.pagoMinimoUsd ?? 0)
      : (t.pagoMinimo ?? 0)
    : usd
      ? (t.montoDeudaActualUsd ?? 0)
      : (t.montoDeudaActual ?? 0)
  const linea = usd ? (t.lineaTotalUsd ?? 0) : t.lineaTotal
  return {
    grad: cardGrads[i % cardGrads.length],
    orb: cardOrbs[i % cardOrbs.length],
    label: t.descripcion,
    amount: `${sym} ${Math.round(pay).toLocaleString('es-PE')}`,
    linea: `Línea ${sym} ${Math.round(linea).toLocaleString('es-PE')}`,
  }
}

type Grp = {
  key: DescripcionResumen['tipo']
  label: string
  color: string
  avatarBg: string
  sign: '+' | '−'
  total: number
  items: DescripcionResumen[]
}

const ingresosItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Ingreso'))
const gastosItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Gasto'))
const deudasItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Deuda'))
const tarjetasItems = computed(() => todasLasDescripciones.value.filter((i) => i.tipo === 'Tarjeta'))

const groups = computed<Grp[]>(() => [
  { key: 'Ingreso', label: 'Ingresos', color: '#1E9E6A', avatarBg: '#E6F4EC', sign: '+', total: resumen.value.totalIngresos, items: ingresosItems.value },
  { key: 'Gasto', label: 'Gastos', color: '#D98A3D', avatarBg: '#FBEFE0', sign: '−', total: resumen.value.totalGastado, items: gastosItems.value },
  { key: 'Deuda', label: 'Deudas · cuota', color: '#B8893A', avatarBg: '#F6EEDD', sign: '−', total: resumen.value.totalCuotaMensualDeudas, items: deudasItems.value },
  { key: 'Tarjeta', label: 'Tarjetas', color: '#C25A4E', avatarBg: '#FBE9E6', sign: '−', total: tarjetasCompromiso.value, items: tarjetasItems.value },
])

type FilterKey = 'all' | DescripcionResumen['tipo']
const activeFilter = ref<FilterKey>('all')
const filterChips: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Todo', color: '#16332F' },
  { key: 'Ingreso', label: 'Ingresos', color: '#1E9E6A' },
  { key: 'Gasto', label: 'Gastos', color: '#D98A3D' },
  { key: 'Deuda', label: 'Deudas', color: '#B8893A' },
  { key: 'Tarjeta', label: 'Tarjetas', color: '#C25A4E' },
]

const visibleGroups = computed(() =>
  groups.value.filter(
    (g) => g.items.length > 0 && (activeFilter.value === 'all' || activeFilter.value === g.key),
  ),
)
const hasData = computed(() => todasLasDescripciones.value.length > 0)

function avatarLetter(text: string): string {
  return (text.trim().charAt(0) || '·').toUpperCase()
}
</script>

<template>
  <div
    class="min-h-screen"
    style="background: #f1ece1; font-family: 'Manrope', system-ui, sans-serif; color: #1c1a15"
    data-testid="dashboard-view"
  >
    <OnboardingModal v-if="showOnboarding" @close="showOnboarding = false" />

    <div style="padding: 62px 18px 110px;" class="mx-auto w-full max-w-[460px]">
      <div class="mb-[18px] flex items-center justify-between">
        <div class="flex items-center gap-[11px]">
          <div
            class="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
            style="background: linear-gradient(140deg, #c8aa72, #8a6840); box-shadow: 0 4px 12px rgba(138, 104, 64, 0.28)"
          >
            <span
              class="font-bold text-white"
              style="font-family: 'Space Grotesk', sans-serif; font-size: 16px; letter-spacing: -0.02em"
              aria-hidden="true"
            >S/</span>
          </div>
          <div>
            <p class="m-0 text-[11px] font-semibold" style="color: #9a9384; letter-spacing: 0.02em">
              {{ todayDate }}
            </p>
            <p class="m-0 mt-px whitespace-nowrap text-[17px] font-extrabold" style="letter-spacing: -0.02em">
              Hola, {{ userName }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border-none bg-white"
            style="box-shadow: 0 1px 3px rgba(28, 26, 21, 0.08)"
            aria-label="Notificaciones"
          >
            <Bell :size="17" style="color: #5a5448" />
            <span
              class="absolute"
              style="top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: #c25a4e; border: 1.5px solid #fff"
            ></span>
          </button>
          <div
            class="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[15px] font-extrabold"
            style="background: linear-gradient(140deg, #2c5e58, #16332f); color: #f1ece1; font-family: 'Space Grotesk', sans-serif; box-shadow: 0 2px 8px rgba(22, 51, 47, 0.3)"
          >
            {{ userInitial }}
          </div>
        </div>
      </div>

      <div
        class="mb-4 flex items-center justify-between rounded-[14px] border bg-white p-[7px]"
        style="border-color: #e7e0d2; box-shadow: 0 1px 2px rgba(28, 26, 21, 0.04)"
      >
        <button
          type="button"
          class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border-none"
          style="background: #f4efe5"
          aria-label="Mes anterior"
          @click="prevMonth"
        >
          <ChevronLeft :size="15" style="color: #8a8273" />
        </button>
        <div class="text-center">
          <p class="m-0 text-[14px] font-bold capitalize" style="letter-spacing: -0.01em">{{ monthLabel }}</p>
          <p class="m-0 text-[10px] font-semibold" style="color: #9a9384">
            {{ isCurrentMonth ? 'Mes en curso' : 'Mes seleccionado' }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border-none disabled:opacity-40"
          style="background: #f4efe5"
          :disabled="isCurrentMonth"
          aria-label="Mes siguiente"
          @click="nextMonth"
        >
          <ChevronRight :size="15" style="color: #8a8273" />
        </button>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-3 py-24"
        style="color: #9a9384"
        data-testid="loading-state"
      >
        <Loader2 :size="26" class="animate-spin" />
        <span class="text-sm">Cargando tu resumen...</span>
      </div>

      <template v-else>
        <div
          class="relative mb-[14px] overflow-hidden rounded-[26px]"
          style="padding: 22px 22px 20px; background: linear-gradient(150deg, #26241c 0%, #141309 100%); box-shadow: 0 18px 40px -12px rgba(20, 19, 13, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
          data-testid="card-balance"
        >
          <div
            class="pointer-events-none absolute mn-orb"
            style="top: -60px; right: -50px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, #c8aa72, transparent 65%); filter: blur(20px); opacity: 0.5"
          ></div>
          <div class="relative">
            <div class="mb-[14px] flex items-center justify-between">
              <div class="flex items-center gap-[7px]">
                <span
                  style="width: 6px; height: 6px; border-radius: 50%"
                  :style="{ background: isPositive ? '#5FD0A8' : '#E89A8E' }"
                ></span>
                <p
                  class="m-0 text-[11px] font-bold uppercase"
                  style="letter-spacing: 0.09em; color: rgba(241, 236, 225, 0.62)"
                >
                  Disponible este mes
                </p>
              </div>
              <span
                class="inline-flex items-center gap-1 rounded-full px-[9px] py-1 text-[11px] font-bold"
                :style="isPositive
                  ? { background: 'rgba(95,208,168,.16)', color: '#7FE0BC' }
                  : { background: 'rgba(232,154,142,.18)', color: '#F0B5AB' }"
              >
                <component :is="isPositive ? ChevronUp : ChevronDown" :size="11" />
                {{ isPositive ? 'En control' : 'Revisar' }}
              </span>
            </div>

            <p
              class="m-0 leading-none"
              style="font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 600; letter-spacing: -0.03em; color: #fbf8f1"
              data-testid="resumen-balance"
            >
              {{ balanceStr }}
            </p>
            <p class="m-0 mt-2 text-[12px] font-medium" style="color: rgba(241, 236, 225, 0.6)">
              {{ heroSubtitle }}
            </p>

            <div class="mt-[18px]">
              <div
                class="flex overflow-hidden"
                style="height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.1)"
              >
                <div :style="{ width: inflowWidth, background: '#5FD0A8' }"></div>
                <div style="flex: 1; background: #d98a3d"></div>
              </div>
              <div class="mt-[9px] flex justify-between">
                <div>
                  <p class="m-0 text-[10px] font-semibold" style="color: rgba(241, 236, 225, 0.5); letter-spacing: 0.04em">ENTRA</p>
                  <p class="m-0 mt-0.5 whitespace-nowrap text-[14px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; color: #9fe6c8">
                    {{ fmt(resumen.totalIngresos) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="m-0 text-[10px] font-semibold" style="color: rgba(241, 236, 225, 0.5); letter-spacing: 0.04em">SALE</p>
                  <p class="m-0 mt-0.5 whitespace-nowrap text-[14px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; color: #ebb98a">
                    {{ fmt(totalSalidas) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-[18px] grid grid-cols-3 gap-[9px]">
          <div
            class="rounded-[16px] border bg-white p-3"
            style="border-color: #e7e0d2; box-shadow: 0 1px 2px rgba(28, 26, 21, 0.04)"
            data-testid="card-ingresos"
          >
            <div class="mb-[9px] flex h-[26px] w-[26px] items-center justify-center rounded-lg" style="background: #e6f4ec">
              <TrendingUp :size="14" style="color: #1e9e6a" />
            </div>
            <p class="m-0 text-[10px] font-semibold" style="color: #9a9384">Ingresos</p>
            <p class="m-0 mt-[3px] text-[17px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em" data-testid="resumen-ingresos">
              {{ fmtShort(resumen.totalIngresos) }}
            </p>
          </div>
          <div
            class="rounded-[16px] border bg-white p-3"
            style="border-color: #e7e0d2; box-shadow: 0 1px 2px rgba(28, 26, 21, 0.04)"
            data-testid="card-gastado"
          >
            <div class="mb-[9px] flex h-[26px] w-[26px] items-center justify-center rounded-lg" style="background: #fbefe0">
              <ShoppingBag :size="14" style="color: #d98a3d" />
            </div>
            <p class="m-0 text-[10px] font-semibold" style="color: #9a9384">Gastado</p>
            <p class="m-0 mt-[3px] text-[17px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em" data-testid="resumen-gastado">
              {{ fmtShort(resumen.totalGastado) }}
            </p>
          </div>
          <div
            class="rounded-[16px] border bg-white p-3"
            style="border-color: #e7e0d2; box-shadow: 0 1px 2px rgba(28, 26, 21, 0.04)"
            data-testid="card-deudas"
          >
            <div class="mb-[9px] flex h-[26px] w-[26px] items-center justify-center rounded-lg" style="background: #f6eedd">
              <Clock :size="14" style="color: #b8893a" />
            </div>
            <p class="m-0 text-[10px] font-semibold" style="color: #9a9384">Deuda</p>
            <p class="m-0 mt-[3px] text-[17px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em" data-testid="resumen-deudas">
              {{ fmtShort(resumen.totalDeudas) }}
            </p>
          </div>
        </div>

        <div
          v-if="showCierreDeMes"
          class="mb-[14px] rounded-[22px] border bg-white p-[18px]"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="cierre-de-mes"
        >
          <div class="mb-4 flex items-center justify-between">
            <div>
              <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">Plan de cierre del mes</p>
              <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">Cómo vas llegando a fin de mes</p>
            </div>
            <span
              class="inline-flex items-center gap-1 rounded-full px-[9px] py-1 text-[11px] font-bold"
              :style="planOk ? { background: '#E6F4EC', color: '#1E9E6A' } : { background: '#FBEDEB', color: '#C25A4E' }"
            >
              <component :is="planOk ? Check : AlertTriangle" :size="12" />
              {{ planOk ? 'En control' : 'Revisar gastos' }}
            </span>
          </div>

          <div class="mb-4 grid grid-cols-3 gap-2">
            <div class="rounded-[13px] p-[11px]" style="background: #f2faf5">
              <p class="m-0 text-[9px] font-bold uppercase" style="letter-spacing: 0.06em; color: #1e9e6a">Ingresos</p>
              <p class="m-0 mt-[5px] text-[16px] font-semibold" style="font-family: 'Space Grotesk', sans-serif">{{ fmtShort(resumen.totalIngresos) }}</p>
            </div>
            <div class="rounded-[13px] p-[11px]" style="background: #fbf4e9">
              <p class="m-0 text-[9px] font-bold uppercase" style="letter-spacing: 0.06em; color: #b8893a">Fijo</p>
              <p class="m-0 mt-[5px] text-[16px] font-semibold" style="font-family: 'Space Grotesk', sans-serif">{{ fmtShort(compromisosFijos) }}</p>
            </div>
            <div class="rounded-[13px] p-[11px]" :style="margenParaGastos >= 0 ? { background: '#EEF2FB' } : { background: '#FBEDEB' }">
              <p class="m-0 text-[9px] font-bold uppercase" style="letter-spacing: 0.06em" :style="{ color: margenParaGastos >= 0 ? '#5B6FB8' : '#C25A4E' }">Margen</p>
              <p class="m-0 mt-[5px] text-[16px] font-semibold" style="font-family: 'Space Grotesk', sans-serif">{{ fmtShort(Math.abs(margenParaGastos)) }}</p>
            </div>
          </div>

          <div class="mb-2 flex items-center justify-between text-[11px]">
            <span style="color: #6e6757">
              Gastaste <strong style="color: #1c1a15">{{ fmtShort(resumen.totalGastado) }}</strong>
              de <strong style="color: #1c1a15">{{ fmtShort(Math.max(margenParaGastos, 0)) }}</strong>
            </span>
            <span class="font-semibold" style="font-family: 'Space Grotesk', sans-serif" :style="{ color: porcentajeGastos > 100 ? '#C25A4E' : '#1E9E6A' }">
              {{ porcentajeGastos > 100 ? '+100' : porcentajeGastos }}%
            </span>
          </div>
          <div class="overflow-hidden" style="height: 9px; border-radius: 999px; background: #f0ebe0">
            <div
              class="h-full transition-all duration-500"
              style="border-radius: 999px"
              :style="{
                width: barGastosWidth,
                background: porcentajeGastos > 100 ? 'linear-gradient(90deg,#D98A3D,#C25A4E)' : 'linear-gradient(90deg,#3FB98C,#1E9E6A)',
              }"
            ></div>
          </div>

          <div
            class="mt-[14px] flex items-start gap-2 rounded-[13px] p-[11px] text-[11.5px] leading-snug"
            :style="planOk ? { background: '#F2FAF5', color: '#1E7A56' } : { background: '#FBF1EF', color: '#B0463C' }"
          >
            <component :is="planOk ? Check : AlertTriangle" :size="14" class="mt-px shrink-0" />
            <span>{{ planNoteText }}</span>
          </div>
        </div>

        <div
          class="mb-[14px] rounded-[22px] border bg-white p-[18px]"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
        >
          <p class="m-0 mb-0.5 text-[14px] font-extrabold" style="letter-spacing: -0.01em">A qué va tu plata</p>
          <p class="m-0 mb-4 text-[11px] font-medium" style="color: #9a9384">Distribución de tus ingresos</p>
          <div class="flex items-center gap-5">
            <div class="relative shrink-0" style="width: 128px; height: 128px">
              <div class="absolute inset-0 rounded-full" :style="{ background: donut.bg }"></div>
              <div class="absolute flex flex-col items-center justify-center rounded-full bg-white" style="inset: 17px">
                <p class="m-0 text-[9px] font-semibold" style="color: #9a9384; letter-spacing: 0.04em">DISPONIBLE</p>
                <p class="m-0 mt-0.5 text-[18px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em">
                  {{ fmt(donut.disponible) }}
                </p>
              </div>
            </div>
            <div class="flex flex-1 flex-col gap-[11px]">
              <div
                v-for="row in donutLegend"
                :key="row.label"
                class="flex items-center justify-between"
              >
                <span class="flex items-center gap-2 text-[12px] font-medium" style="color: #5a5448">
                  <span class="shrink-0" style="width: 9px; height: 9px; border-radius: 3px" :style="{ background: row.color }"></span>
                  {{ row.label }}
                </span>
                <span class="text-[12px] font-semibold" style="font-family: 'Space Grotesk', sans-serif">{{ fmt(row.value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mx-0.5 mb-[11px] flex items-center justify-between">
          <p class="m-0 text-[15px] font-extrabold" style="letter-spacing: -0.01em">Tarjetas</p>
          <div class="flex rounded-full p-[3px]" style="background: #e9e2d4">
            <button
              type="button"
              class="rounded-full border-none px-[11px] py-[5px] text-[11px] font-bold transition-all"
              :style="isMinimo
                ? { background: '#fff', color: '#16332F', boxShadow: '0 1px 3px rgba(28,26,21,.12)' }
                : { background: 'transparent', color: '#8C8578' }"
              data-testid="tarjeta-mode-minimo"
              @click="tarjetaPagoMode = 'minimo'"
            >
              Mínimo
            </button>
            <button
              type="button"
              class="rounded-full border-none px-[11px] py-[5px] text-[11px] font-bold transition-all"
              :style="!isMinimo
                ? { background: '#fff', color: '#16332F', boxShadow: '0 1px 3px rgba(28,26,21,.12)' }
                : { background: 'transparent', color: '#8C8578' }"
              data-testid="tarjeta-mode-total"
              @click="tarjetaPagoMode = 'total'"
            >
              Pago del mes
            </button>
          </div>
        </div>

        <div
          ref="tarjetasScrollRef"
          v-if="tarjetas.length > 0"
          class="mn-scroll mb-[18px] flex gap-3 overflow-x-auto px-0.5 pb-1.5 pt-0.5"
          style="scroll-snap-type: x proximity"
          data-testid="card-tarjetas"
        >
          <div
            v-for="(t, i) in tarjetas"
            :key="t.id"
            class="relative shrink-0 overflow-hidden rounded-[20px] p-[17px]"
            style="width: 240px; color: #f1ece1; scroll-snap-align: start"
            :style="{ background: tarjetaView(t, i).grad, boxShadow: '0 10px 24px -10px rgba(15,43,40,.6)' }"
          >
            <div
              class="absolute"
              style="top: -30px; right: -20px; width: 110px; height: 110px; border-radius: 50%"
              :style="{ background: tarjetaView(t, i).orb }"
            ></div>
            <div class="mb-6 flex items-center justify-between">
              <span class="truncate text-[11px] font-semibold" style="letter-spacing: 0.03em; color: rgba(241, 236, 225, 0.7)">
                {{ tarjetaView(t, i).label }}
              </span>
              <div style="width: 30px; height: 21px; border-radius: 5px; background: linear-gradient(135deg, #e8c97e, #b8893a)"></div>
            </div>
            <p class="m-0 text-[10px] font-semibold" style="color: rgba(241, 236, 225, 0.55); letter-spacing: 0.05em">A PAGAR ESTE MES</p>
            <p class="m-0 mt-1 text-[24px] font-semibold" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em">
              {{ tarjetaView(t, i).amount }}
            </p>
            <div class="mt-[14px] flex items-center justify-end">
              <span class="text-[10px]" style="color: rgba(241, 236, 225, 0.55)">{{ tarjetaView(t, i).linea }}</span>
            </div>
          </div>
        </div>
        <div
          v-else
          class="mb-[18px] rounded-[20px] border border-dashed px-4 py-6 text-center text-[12px] font-medium"
          style="border-color: #e7e0d2; color: #9a9384"
        >
          Aún no registraste tarjetas.
        </div>

        <div class="mx-0.5 mb-[11px] flex items-center justify-between">
          <p class="m-0 text-[15px] font-extrabold" style="letter-spacing: -0.01em">Movimientos</p>
          <span class="text-[11px] font-semibold" style="color: #9a9384">{{ todasLasDescripciones.length }} este mes</span>
        </div>

        <div ref="chipsScrollRef" class="mn-scroll mb-3 flex gap-[7px] overflow-x-auto px-0.5 pb-3">
          <button
            v-for="chip in filterChips"
            :key="chip.key"
            type="button"
            class="whitespace-nowrap rounded-full border-none px-[14px] py-[7px] text-[12px] font-bold transition-all"
            :style="activeFilter === chip.key
              ? { background: chip.color, color: '#fff', boxShadow: '0 2px 8px -2px ' + chip.color }
              : { background: '#fff', color: '#8C8578', border: '1px solid #E7E0D2' }"
            @click="activeFilter = chip.key"
          >
            {{ chip.label }}
          </button>
        </div>

        <div
          v-if="!hasData"
          class="flex flex-col items-center justify-center rounded-[22px] border bg-white px-5 py-14 text-center"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="descriptions-empty"
        >
          <p class="m-0 text-[14px] font-bold">Sin movimientos</p>
          <p class="m-0 mt-1 text-[12px]" style="color: #9a9384">Registrá ingresos o gastos para verlos acá.</p>
        </div>

        <div
          v-else
          class="overflow-hidden rounded-[22px] border bg-white"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="descriptions-list"
        >
          <div v-for="group in visibleGroups" :key="group.key" style="border-top: 1px solid #f0ebe0" class="first:border-t-0">
            <div class="flex items-center justify-between px-4 pb-2 pt-3">
              <span class="text-[11px] font-extrabold uppercase" style="letter-spacing: 0.04em" :style="{ color: group.color }">
                {{ group.label }}
              </span>
              <span class="text-[13px] font-semibold" style="font-family: 'Space Grotesk', sans-serif" :style="{ color: group.color }">
                {{ group.sign }}{{ fmt(group.total) }}
              </span>
            </div>
            <div
              v-for="(item, idx) in group.items"
              :key="group.key + '-' + idx"
              class="flex items-center gap-[11px] px-4 py-[11px]"
              style="border-top: 1px solid #f6f2ea"
              data-testid="description-item"
            >
              <div
                class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-[14px] font-semibold"
                style="font-family: 'Space Grotesk', sans-serif"
                :style="{ background: group.avatarBg, color: group.color }"
              >
                {{ avatarLetter(item.descripcion) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="m-0 truncate text-[13px] font-bold">{{ item.descripcion }}</p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384" data-testid="description-type">{{ item.tipo }}</p>
              </div>
              <span
                class="shrink-0 text-[14px] font-semibold"
                style="font-family: 'Space Grotesk', sans-serif"
                :style="{ color: group.color }"
                data-testid="description-monto"
              >
                {{ group.sign }}{{ fmt(item.monto) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mn-scroll::-webkit-scrollbar {
  display: none;
}
.mn-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.mn-orb {
  animation: mnSheen 9s ease-in-out infinite alternate;
}
@keyframes mnSheen {
  0% {
    transform: scale(1) translate(0, 0);
  }
  100% {
    transform: scale(1.2) translate(-15px, 15px);
  }
}
</style>
