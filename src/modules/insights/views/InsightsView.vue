<script setup lang="ts">
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingDown,
  CreditCard,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-vue-next'
import { useInsights } from '../composables/useInsights'
import { formatMoneyDisplay } from '~/shared/utils/format'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import LoadingBar from '~/shared/components/ui/LoadingBar.vue'
import AiInsightsPanel from '../components/AiInsightsPanel.vue'

const {
  isLoading,
  hasData,
  score,
  alerts,
  categoryAnalysis,
  debtProjections,
  creditHealth,
  creditUtilizationTotal,
  tips,
} = useInsights()

const severityConfig = {
  critical: { color: '#DC2626', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
  warning: { color: '#D4A017', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
  info: { color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200', icon: Info },
}

const creditStatusColor: Record<string, string> = {
  bueno: '#16A34A',
  moderado: '#D4A017',
  alto: '#EA580C',
  critico: '#DC2626',
}

const tipIcons: Record<string, typeof Sparkles> = {
  ahorro: Sparkles,
  deuda: TrendingDown,
  gasto: Target,
  credito: CreditCard,
}

function formatMonth(iso: string): string {
  if (iso === 'N/A') return 'Indefinido'
  const [year, month] = iso.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[Number(month) - 1]} ${year}`
}
</script>

<template>
  <div
    class="min-h-screen"
    style="background: #f1ece1; font-family: 'Manrope', system-ui, sans-serif; color: #1c1a15"
    data-testid="insights-view"
  >
    <div class="mx-auto w-full max-w-[460px] px-[18px] pb-28 pt-6">
      <div class="mb-5">
        <h1 class="m-0 text-[26px] font-extrabold" style="letter-spacing: -0.02em">Insights</h1>
        <p class="m-0 mt-1 text-[13px] font-medium" style="color: #9a9384">
          Análisis inteligente de tus finanzas
        </p>
      </div>

      <LoadingBar :active="isLoading" color="#B8893A" />

      <EmptyState
        v-if="!isLoading && !hasData"
        :icon="Lightbulb"
        color="#B8893A"
        title="Sin datos para analizar"
        subtitle="Agrega ingresos, gastos, deudas o tarjetas para ver tus insights"
        testid="insights-empty"
      />

      <div v-if="!isLoading && hasData" class="space-y-[14px]">
        <div
          class="rounded-[22px] border bg-white p-[18px]"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="score-section"
        >
          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
              style="background: #f4eedf"
            >
              <Lightbulb :size="16" style="color: #b8893a" aria-hidden="true" />
            </div>
            <div>
              <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">
                Score Financiero
              </p>
              <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">
                Evaluación general de tu salud financiera
              </p>
            </div>
          </div>

          <div class="flex items-center gap-5">
            <div class="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#F0EBE0" stroke-width="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  :stroke="score.color"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="`${(score.total / 100) * 327} 327`"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  class="text-[28px] font-black leading-none"
                  style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                  data-testid="score-value"
                >{{ score.total }}</span>
                <span
                  class="mt-0.5 text-[10px] font-bold"
                  :style="{ color: score.color }"
                  data-testid="score-label"
                >{{ score.label }}</span>
              </div>
            </div>

            <div class="flex-1 space-y-3">
              <div
                v-for="item in [
                  { label: 'Tasa de ahorro', value: score.savingsRatio, max: 25 },
                  { label: 'Utilización crédito', value: score.creditUtilization, max: 25 },
                  { label: 'Control de gastos', value: score.expenseControl, max: 25 },
                  { label: 'Gestión de deudas', value: score.debtManagement, max: 25 },
                ]"
                :key="item.label"
                data-testid="score-breakdown-item"
              >
                <div class="mb-1 flex justify-between text-[11px]">
                  <span class="font-medium" style="color: #6e6757">{{ item.label }}</span>
                  <span
                    class="font-bold"
                    style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                  >{{ item.value }}/{{ item.max }}</span>
                </div>
                <div
                  class="overflow-hidden"
                  style="height: 7px; border-radius: 999px; background: #f0ebe0"
                >
                  <div
                    class="h-full transition-all duration-500"
                    style="border-radius: 999px"
                    :style="{ width: `${(item.value / item.max) * 100}%`, backgroundColor: score.color }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="alerts.length > 0" data-testid="alerts-section">
          <p class="m-0 mb-2 text-[15px] font-extrabold" style="letter-spacing: -0.01em">Alertas</p>
          <div class="space-y-2">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="flex items-start gap-3 rounded-[18px] border p-4"
              :class="[severityConfig[alert.severity].bg, severityConfig[alert.severity].border]"
              data-testid="alert-card"
            >
              <component
                :is="severityConfig[alert.severity].icon"
                :size="16"
                :style="{ color: severityConfig[alert.severity].color }"
                class="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p class="m-0 text-[13px] font-bold" style="color: #1c1a15">{{ alert.title }}</p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #6e6757">
                  {{ alert.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <details
          v-if="categoryAnalysis.length > 0"
          class="group overflow-hidden rounded-[22px] border bg-white"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="category-section"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style="background: #fbefe0"
              >
                <Target :size="16" style="color: #d98a3d" aria-hidden="true" />
              </div>
              <div>
                <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">
                  Distribución de Gastos
                </p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">
                  {{ categoryAnalysis.length }} categorías
                </p>
              </div>
            </div>
            <ChevronRight
              :size="15"
              style="color: #9a9384"
              class="shrink-0 transition-transform group-open:rotate-90"
            />
          </summary>

          <div style="border-top: 1px solid #f0ebe0">
            <div class="space-y-4 px-[18px] pb-[18px] pt-4">
              <div v-for="cat in categoryAnalysis" :key="cat.nombre" data-testid="category-item">
                <div class="mb-1.5 flex justify-between text-[12px]">
                  <span class="font-semibold" style="color: #1c1a15">{{ cat.nombre }}</span>
                  <div class="flex items-center gap-3">
                    <span class="font-medium" style="color: #9a9384">
                      {{ cat.porcentaje.toFixed(1) }}%
                    </span>
                    <span
                      class="font-bold"
                      style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                    >S/{{ formatMoneyDisplay(cat.monto) }}</span>
                  </div>
                </div>
                <div
                  class="overflow-hidden"
                  style="height: 7px; border-radius: 999px; background: #f0ebe0"
                >
                  <div
                    class="h-full transition-all duration-500"
                    style="border-radius: 999px; background: linear-gradient(90deg, #d98a3d, #c65a3a)"
                    :style="{ width: `${cat.porcentaje}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </details>

        <details
          v-if="debtProjections.length > 0"
          class="group overflow-hidden rounded-[22px] border bg-white"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="debt-section"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style="background: #f6eedd"
              >
                <TrendingDown :size="16" style="color: #b8893a" aria-hidden="true" />
              </div>
              <div>
                <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">
                  Proyección de Deudas
                </p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">
                  {{ debtProjections.length }} deudas activas
                </p>
              </div>
            </div>
            <ChevronRight
              :size="15"
              style="color: #9a9384"
              class="shrink-0 transition-transform group-open:rotate-90"
            />
          </summary>

          <div style="border-top: 1px solid #f0ebe0">
            <div class="space-y-3 px-[18px] pb-[18px] pt-4">
              <div
                v-for="proj in debtProjections"
                :key="proj.deudaId"
                class="rounded-[16px] border p-4"
                style="background: #f8f5ef; border-color: #e7e0d2"
                data-testid="debt-projection-card"
              >
                <div class="mb-3 flex items-center justify-between">
                  <span class="text-[13px] font-bold" style="color: #1c1a15">
                    {{ proj.nombrePersona }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                    :class="
                      proj.mesesRestantes <= 6
                        ? 'bg-green-50 text-green-700'
                        : proj.mesesRestantes <= 12
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    "
                  >
                    {{ proj.mesesRestantes === Infinity ? '∞' : proj.mesesRestantes }} meses
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <p
                      class="m-0 text-[10px] font-semibold uppercase"
                      style="letter-spacing: 0.04em; color: #9a9384"
                    >Pendiente</p>
                    <p
                      class="m-0 mt-1 text-[13px] font-bold"
                      style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                    >S/{{ formatMoneyDisplay(proj.montoActualPendiente) }}</p>
                  </div>
                  <div>
                    <p
                      class="m-0 text-[10px] font-semibold uppercase"
                      style="letter-spacing: 0.04em; color: #9a9384"
                    >Intereses</p>
                    <p
                      class="m-0 mt-1 text-[13px] font-bold"
                      style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                    >S/{{ formatMoneyDisplay(proj.totalIntereses) }}</p>
                  </div>
                  <div>
                    <p
                      class="m-0 text-[10px] font-semibold uppercase"
                      style="letter-spacing: 0.04em; color: #9a9384"
                    >Libre en</p>
                    <p
                      class="m-0 mt-1 text-[13px] font-bold"
                      style="font-family: 'Space Grotesk', sans-serif; color: #1c1a15"
                    >{{ formatMonth(proj.fechaEstimada) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

        <details
          v-if="creditHealth.length > 0"
          class="group overflow-hidden rounded-[22px] border bg-white"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="credit-section"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style="background: #fbe9e6"
              >
                <CreditCard :size="16" style="color: #c25a4e" aria-hidden="true" />
              </div>
              <div>
                <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">
                  Salud Crediticia
                </p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">
                  Utilización:
                  <span
                    class="font-bold"
                    :style="{
                      color:
                        creditStatusColor[
                          creditUtilizationTotal < 30
                            ? 'bueno'
                            : creditUtilizationTotal < 50
                              ? 'moderado'
                              : creditUtilizationTotal < 75
                                ? 'alto'
                                : 'critico'
                        ],
                    }"
                  >{{ creditUtilizationTotal.toFixed(0) }}%</span>
                </p>
              </div>
            </div>
            <ChevronRight
              :size="15"
              style="color: #9a9384"
              class="shrink-0 transition-transform group-open:rotate-90"
            />
          </summary>

          <div style="border-top: 1px solid #f0ebe0">
            <div class="space-y-4 px-[18px] pb-[18px] pt-4">
              <div v-for="card in creditHealth" :key="card.tarjetaId" data-testid="credit-card-item">
                <div class="mb-1.5 flex justify-between text-[12px]">
                  <span class="font-semibold" style="color: #1c1a15">{{ card.descripcion }}</span>
                  <span
                    class="font-bold"
                    style="font-family: 'Space Grotesk', sans-serif"
                    :style="{ color: creditStatusColor[card.status] }"
                  >{{ card.utilizacion.toFixed(0) }}%</span>
                </div>
                <div
                  class="overflow-hidden"
                  style="height: 7px; border-radius: 999px; background: #f0ebe0"
                >
                  <div
                    class="h-full transition-all duration-500"
                    style="border-radius: 999px"
                    :style="{
                      width: `${Math.min(card.utilizacion, 100)}%`,
                      backgroundColor: creditStatusColor[card.status],
                    }"
                  />
                </div>
                <div
                  class="mt-1.5 flex justify-between"
                  style="font-size: 10px; color: #9a9384"
                >
                  <span>S/{{ formatMoneyDisplay(card.deudaActual) }} usado</span>
                  <span>Línea: S/{{ formatMoneyDisplay(card.lineaTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </details>

        <details
          v-if="tips.length > 0"
          class="group overflow-hidden rounded-[22px] border bg-white"
          style="border-color: #e7e0d2; box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05)"
          data-testid="tips-section"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style="background: #ebf5f5"
              >
                <Sparkles :size="16" style="color: #4d9b97" aria-hidden="true" />
              </div>
              <div>
                <p class="m-0 text-[14px] font-extrabold" style="letter-spacing: -0.01em">
                  Recomendaciones
                </p>
                <p class="m-0 mt-0.5 text-[11px] font-medium" style="color: #9a9384">
                  {{ tips.length }} tips personalizados
                </p>
              </div>
            </div>
            <ChevronRight
              :size="15"
              style="color: #9a9384"
              class="shrink-0 transition-transform group-open:rotate-90"
            />
          </summary>

          <div style="border-top: 1px solid #f0ebe0">
            <div class="px-[18px] pb-[18px]">
              <div
                v-for="tip in tips"
                :key="tip.id"
                class="flex items-start gap-3 pt-4"
                data-testid="tip-card"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                  style="background: #ebf5f5"
                >
                  <component
                    :is="tipIcons[tip.category] ?? Sparkles"
                    :size="14"
                    style="color: #4d9b97"
                    aria-hidden="true"
                  />
                </div>
                <p class="m-0 pt-1 text-[13px] font-medium leading-snug" style="color: #1c1a15">
                  {{ tip.text }}
                </p>
              </div>
            </div>
          </div>
        </details>

        <AiInsightsPanel />
      </div>
    </div>
  </div>
</template>
