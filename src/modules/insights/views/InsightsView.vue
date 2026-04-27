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
import PageHeader from '~/shared/components/layout/PageHeader.vue'
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
  <div class="min-h-screen bg-[#F8F6F1]" data-testid="insights-view">
    <div class="max-w-4xl mx-auto p-5 lg:p-8 space-y-5">
      <PageHeader title="Insights" subtitle="Análisis inteligente de tus finanzas" />

      <LoadingBar :active="isLoading" color="#2D9F8F" />

      <EmptyState
        v-if="!isLoading && !hasData"
        :icon="Lightbulb"
        color="#2D9F8F"
        title="Sin datos para analizar"
        subtitle="Agrega ingresos, gastos, deudas o tarjetas para ver tus insights"
        testid="insights-empty"
      />

      <template v-if="!isLoading && hasData">
        <!-- Score Financiero -->
        <div class="bg-white rounded-2xl shadow-sm border border-[#EEEEF0] p-6 lg:p-8" data-testid="score-section">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: rgba(45, 159, 143, 0.12)"
            >
              <Lightbulb :size="18" style="color: #2d9f8f" aria-hidden="true" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-[#1A1A2E]">Score Financiero</h2>
              <p class="text-xs text-[#94A3B8]">Evaluación general de tu salud financiera</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-8">
            <!-- Score circle -->
            <div class="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#EEEEF0" stroke-width="8" />
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
                <span class="text-3xl font-black text-[#1A1A2E]" data-testid="score-value">{{ score.total }}</span>
                <span class="text-xs font-semibold" :style="{ color: score.color }" data-testid="score-label">{{
                  score.label
                }}</span>
              </div>
            </div>

            <!-- Score breakdown -->
            <div class="flex-1 w-full space-y-3">
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
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-[#64748B] font-medium">{{ item.label }}</span>
                  <span class="font-bold text-[#1A1A2E]">{{ item.value }}/{{ item.max }}</span>
                </div>
                <div class="h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{ width: `${(item.value / item.max) * 100}%`, backgroundColor: score.color }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alertas -->
        <div v-if="alerts.length > 0" class="space-y-3" data-testid="alerts-section">
          <h2 class="text-sm font-bold text-[#1A1A2E] px-1">Alertas</h2>
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="flex items-start gap-3 p-4 rounded-xl border"
            :class="[severityConfig[alert.severity].bg, severityConfig[alert.severity].border]"
            data-testid="alert-card"
          >
            <component
              :is="severityConfig[alert.severity].icon"
              :size="18"
              :style="{ color: severityConfig[alert.severity].color }"
              class="shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p class="text-sm font-semibold text-[#1A1A2E]">{{ alert.title }}</p>
              <p class="text-xs text-[#64748B] mt-0.5">{{ alert.description }}</p>
            </div>
          </div>
        </div>

        <!-- Análisis de Gastos -->
        <details
          v-if="categoryAnalysis.length > 0"
          class="group bg-white rounded-2xl shadow-sm border border-[#EEEEF0]"
          data-testid="category-section"
        >
          <summary class="p-6 cursor-pointer list-none flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                style="background: rgba(198, 90, 58, 0.12)"
              >
                <Target :size="18" style="color: #c65a3a" aria-hidden="true" />
              </div>
              <div>
                <h2 class="text-sm font-bold text-[#1A1A2E]">Distribución de Gastos</h2>
                <p class="text-xs text-[#94A3B8]">{{ categoryAnalysis.length }} categorías</p>
              </div>
            </div>
            <ChevronRight :size="16" class="text-[#94A3B8] transition-transform group-open:rotate-90" />
          </summary>

          <div class="px-6 pb-6 space-y-4">
            <div v-for="cat in categoryAnalysis" :key="cat.nombre" data-testid="category-item">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-medium text-[#1A1A2E]">{{ cat.nombre }}</span>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-[#94A3B8]">{{ cat.porcentaje.toFixed(1) }}%</span>
                  <span class="font-bold text-[#1A1A2E]">S/{{ formatMoneyDisplay(cat.monto) }}</span>
                </div>
              </div>
              <div class="h-2.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  style="background: linear-gradient(90deg, #c65a3a, #c65a3acc)"
                  :style="{ width: `${cat.porcentaje}%` }"
                />
              </div>
            </div>
          </div>
        </details>

        <!-- Proyección de Deudas -->
        <details
          v-if="debtProjections.length > 0"
          class="group bg-white rounded-2xl shadow-sm border border-[#EEEEF0]"
          data-testid="debt-section"
        >
          <summary class="p-6 cursor-pointer list-none flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                style="background: rgba(212, 160, 23, 0.12)"
              >
                <TrendingDown :size="18" style="color: #d4a017" aria-hidden="true" />
              </div>
              <div>
                <h2 class="text-sm font-bold text-[#1A1A2E]">Proyección de Deudas</h2>
                <p class="text-xs text-[#94A3B8]">{{ debtProjections.length }} deudas activas</p>
              </div>
            </div>
            <ChevronRight :size="16" class="text-[#94A3B8] transition-transform group-open:rotate-90" />
          </summary>

          <div class="px-6 pb-6 space-y-4">
            <div
              v-for="proj in debtProjections"
              :key="proj.deudaId"
              class="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEF0]"
              data-testid="debt-projection-card"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-[#1A1A2E]">{{ proj.nombrePersona }}</span>
                <span
                  class="text-xs font-bold px-2.5 py-1 rounded-full"
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
              <div class="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p class="text-[#94A3B8]">Pendiente</p>
                  <p class="font-bold text-[#1A1A2E]">S/{{ formatMoneyDisplay(proj.montoActualPendiente) }}</p>
                </div>
                <div>
                  <p class="text-[#94A3B8]">Intereses</p>
                  <p class="font-bold text-[#1A1A2E]">S/{{ formatMoneyDisplay(proj.totalIntereses) }}</p>
                </div>
                <div>
                  <p class="text-[#94A3B8]">Libre en</p>
                  <p class="font-bold text-[#1A1A2E]">{{ formatMonth(proj.fechaEstimada) }}</p>
                </div>
              </div>
            </div>
          </div>
        </details>

        <!-- Salud Crediticia -->
        <details
          v-if="creditHealth.length > 0"
          class="group bg-white rounded-2xl shadow-sm border border-[#EEEEF0]"
          data-testid="credit-section"
        >
          <summary class="p-6 cursor-pointer list-none flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                style="background: rgba(106, 30, 45, 0.1)"
              >
                <CreditCard :size="18" style="color: #6a1e2d" aria-hidden="true" />
              </div>
              <div>
                <h2 class="text-sm font-bold text-[#1A1A2E]">Salud Crediticia</h2>
                <p class="text-xs text-[#94A3B8]">
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
                  >
                    {{ creditUtilizationTotal.toFixed(0) }}%
                  </span>
                </p>
              </div>
            </div>
            <ChevronRight :size="16" class="text-[#94A3B8] transition-transform group-open:rotate-90" />
          </summary>

          <div class="px-6 pb-6 space-y-4">
            <div v-for="card in creditHealth" :key="card.tarjetaId" data-testid="credit-card-item">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-medium text-[#1A1A2E]">{{ card.descripcion }}</span>
                <span class="text-xs font-bold" :style="{ color: creditStatusColor[card.status] }">
                  {{ card.utilizacion.toFixed(0) }}%
                </span>
              </div>
              <div class="h-2.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: `${Math.min(card.utilizacion, 100)}%`,
                    backgroundColor: creditStatusColor[card.status],
                  }"
                />
              </div>
              <div class="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                <span>S/{{ formatMoneyDisplay(card.deudaActual) }} usado</span>
                <span>Línea: S/{{ formatMoneyDisplay(card.lineaTotal) }}</span>
              </div>
            </div>
          </div>
        </details>

        <!-- Tips Personalizados -->
        <details
          v-if="tips.length > 0"
          class="group bg-white rounded-2xl shadow-sm border border-[#EEEEF0]"
          data-testid="tips-section"
        >
          <summary class="p-6 cursor-pointer list-none flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                style="background: rgba(45, 159, 143, 0.12)"
              >
                <Sparkles :size="18" style="color: #2d9f8f" aria-hidden="true" />
              </div>
              <div>
                <h2 class="text-sm font-bold text-[#1A1A2E]">Recomendaciones</h2>
                <p class="text-xs text-[#94A3B8]">{{ tips.length }} tips personalizados</p>
              </div>
            </div>
            <ChevronRight :size="16" class="text-[#94A3B8] transition-transform group-open:rotate-90" />
          </summary>

          <div class="px-6 pb-6 space-y-3">
            <div
              v-for="tip in tips"
              :key="tip.id"
              class="flex items-start gap-3 p-3 rounded-xl bg-[#FAFAFA]"
              data-testid="tip-card"
            >
              <component
                :is="tipIcons[tip.category] ?? Sparkles"
                :size="16"
                style="color: #2d9f8f"
                class="shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p class="text-sm text-[#1A1A2E]">{{ tip.text }}</p>
            </div>
          </div>
        </details>
        <!-- Análisis con IA -->
        <AiInsightsPanel />
      </template>
    </div>
  </div>
</template>
