<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CreditCard, Clock, Wallet } from 'lucide-vue-next'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import DeudasView from '~/modules/deudas/views/DeudasView.vue'
import TarjetasView from '~/modules/tarjetas/views/TarjetasView.vue'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'

type Tab = 'prestamos' | 'tarjetas'

const route = useRoute()
const router = useRouter()

const initialTab: Tab = route.query.tab === 'tarjetas' ? 'tarjetas' : 'prestamos'
const activeTab = ref<Tab>(initialTab)

const deudasRef = ref<InstanceType<typeof DeudasView> | null>(null)
const tarjetasRef = ref<InstanceType<typeof TarjetasView> | null>(null)

const { totalPendiente: totalPrestamos, deudas } = useDeudas()
const { totalTarjetas, lineaTotalCombinada, tarjetas, pagoMensualTotal } = useTarjetas()

const totalCredito = computed(() => totalPrestamos.value + totalTarjetas.value)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function formatShort(value: number): string {
  if (Math.abs(value) >= 1000) return `S/ ${(value / 1000).toFixed(1)}K`
  return formatCurrency(value)
}

function setTab(tab: Tab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

function handleAction() {
  if (activeTab.value === 'prestamos') {
    deudasRef.value?.openModal()
  } else {
    tarjetasRef.value?.openModal()
  }
}

const actionLabel = computed(() =>
  activeTab.value === 'prestamos' ? 'Agregar préstamo' : 'Agregar tarjeta',
)
const actionColor = computed(() => (activeTab.value === 'prestamos' ? '#D4A017' : '#BE185D'))
</script>

<template>
  <div class="min-h-full bg-[#F8F6F1]" data-testid="creditos-view">
    <div class="max-w-6xl mx-auto p-5 lg:p-8 space-y-5">
      <PageHeader
        title="Créditos"
        subtitle="Préstamos y tarjetas en un solo lugar"
        :button-label="actionLabel"
        :button-color="actionColor"
        button-testid="open-modal-button"
        @action="handleAction"
      />

      <!-- Stat grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="creditos-summary">
        <div
          class="rounded-2xl p-4 border shadow-sm"
          style="background: linear-gradient(135deg, #EBF5F5 0%, #D5EDED 100%); border-color: rgba(77, 155, 151, 0.25);"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(77, 155, 151, 0.14);">
              <Wallet :size="14" style="color: #356E6B" aria-hidden="true" />
            </div>
            <p class="text-xs font-medium" style="color: #356E6B">Total crédito</p>
          </div>
          <p class="text-xl lg:text-2xl font-bold tabular-nums tracking-tight text-[#1C1B18]" data-testid="total-credito">
            {{ formatCurrency(totalCredito) }}
          </p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock :size="14" class="text-amber-600" />
            </div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Préstamos</p>
          </div>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">{{ formatShort(totalPrestamos) }}</p>
          <p class="text-[11px] text-slate-500 mt-0.5">{{ deudas.length }} activo{{ deudas.length !== 1 ? 's' : '' }}</p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <CreditCard :size="14" class="text-rose-600" />
            </div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pago del mes</p>
          </div>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">{{ formatShort(pagoMensualTotal) }}</p>
          <p class="text-[11px] text-slate-500 mt-0.5">{{ tarjetas.length }} tarjeta{{ tarjetas.length !== 1 ? 's' : '' }}</p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Línea total</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">{{ formatShort(lineaTotalCombinada) }}</p>
          <p v-if="lineaTotalCombinada > 0" class="text-[11px] text-slate-500 mt-0.5">
            {{ Math.round((totalTarjetas / lineaTotalCombinada) * 100) }}% uso
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden" data-testid="creditos-tabs">
        <div class="flex border-b border-slate-100" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'prestamos'"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative"
            :class="activeTab === 'prestamos' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'"
            data-testid="tab-prestamos"
            @click="setTab('prestamos')"
          >
            <Clock :size="15" />
            Préstamos
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              :class="activeTab === 'prestamos' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
            >{{ deudas.length }}</span>
            <span
              v-if="activeTab === 'prestamos'"
              class="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500"
            ></span>
          </button>

          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'tarjetas'"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative"
            :class="activeTab === 'tarjetas' ? 'text-rose-700' : 'text-slate-500 hover:text-slate-700'"
            data-testid="tab-tarjetas"
            @click="setTab('tarjetas')"
          >
            <CreditCard :size="15" />
            Tarjetas
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              :class="activeTab === 'tarjetas' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'"
            >{{ tarjetas.length }}</span>
            <span
              v-if="activeTab === 'tarjetas'"
              class="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500"
            ></span>
          </button>
        </div>

        <div class="p-4 lg:p-5">
          <DeudasView v-if="activeTab === 'prestamos'" ref="deudasRef" embedded />
          <TarjetasView v-else ref="tarjetasRef" embedded />
        </div>
      </div>
    </div>
  </div>
</template>
