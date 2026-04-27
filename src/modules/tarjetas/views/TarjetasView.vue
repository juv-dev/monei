<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { CreditCard, Inbox } from 'lucide-vue-next'
import { useTarjetas } from '../composables/useTarjetas'
import { useTarjetaPagos } from '../composables/useTarjetaPagos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import TarjetaCard from '../components/TarjetaCard.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import type { TarjetaCredito } from '../types'

defineProps<{ embedded?: boolean }>()

const {
  tarjetas,
  isLoading,
  isError,
  totalTarjetas,
  lineaTotalCombinada,
  addTarjeta,
  removeTarjeta,
  updateTarjeta,
  isAdding,
  isUpdating,
} = useTarjetas()

const { addPago, removePago, isAddingPago, pagosDeTarjeta } = useTarjetaPagos()

const { startLoading, finishLoading, showToast } = useAppFeedback()

const form = reactive({
  lineaTotal: '',
  montoDeudaActual: '',
  pagoMinimo: '',
  saldoTotal: '',
  lineaTotalUsd: '',
  montoDeudaActualUsd: '',
  pagoMinimoUsd: '',
  saldoTotalUsd: '',
  descripcion: '',
})
const formError = ref<string | null>(null)
const isModalOpen = ref(false)
const lineaCurrency = ref<'pen' | 'usd' | 'both'>('pen')
const hasGastosPen = ref(true)
const hasGastosUsd = ref(false)
const hasLineaPen = computed(() => lineaCurrency.value === 'pen' || lineaCurrency.value === 'both')
const hasLineaUsd = computed(() => lineaCurrency.value === 'usd' || lineaCurrency.value === 'both')

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

const utilizacionTotal = computed(() =>
  lineaTotalCombinada.value > 0 ? Math.round((totalTarjetas.value / lineaTotalCombinada.value) * 100) : 0,
)

const editingId = ref<string | null>(null)
const isEditing = computed(() => editingId.value !== null)

function resetForm(): void {
  Object.assign(form, {
    lineaTotal: '',
    montoDeudaActual: '',
    pagoMinimo: '',
    saldoTotal: '',
    lineaTotalUsd: '',
    montoDeudaActualUsd: '',
    pagoMinimoUsd: '',
    saldoTotalUsd: '',
    descripcion: '',
  })
}

function openModal(): void {
  formError.value = null
  editingId.value = null
  lineaCurrency.value = 'pen'
  hasGastosPen.value = true
  hasGastosUsd.value = false
  resetForm()
  isModalOpen.value = true
}

function startEdit(tarjeta: TarjetaCredito): void {
  payingId.value = null
  formError.value = null
  editingId.value = tarjeta.id
  form.descripcion = tarjeta.descripcion
  form.lineaTotal = tarjeta.lineaTotal ? formatMoneyDisplay(String(tarjeta.lineaTotal)) : ''
  form.montoDeudaActual = tarjeta.montoDeudaActual ? formatMoneyDisplay(String(tarjeta.montoDeudaActual)) : ''
  form.pagoMinimo = tarjeta.pagoMinimo != null ? formatMoneyDisplay(String(tarjeta.pagoMinimo)) : ''
  form.saldoTotal = tarjeta.saldoTotal != null ? formatMoneyDisplay(String(tarjeta.saldoTotal)) : ''
  form.lineaTotalUsd = tarjeta.lineaTotalUsd != null ? formatMoneyDisplay(String(tarjeta.lineaTotalUsd)) : ''
  form.montoDeudaActualUsd = tarjeta.montoDeudaActualUsd != null ? formatMoneyDisplay(String(tarjeta.montoDeudaActualUsd)) : ''
  form.pagoMinimoUsd = tarjeta.pagoMinimoUsd != null ? formatMoneyDisplay(String(tarjeta.pagoMinimoUsd)) : ''
  form.saldoTotalUsd = tarjeta.saldoTotalUsd != null ? formatMoneyDisplay(String(tarjeta.saldoTotalUsd)) : ''

  const tienePen = tarjeta.lineaTotal > 0
  const tieneUsd = tarjeta.lineaTotalUsd != null && tarjeta.lineaTotalUsd > 0
  lineaCurrency.value = tienePen && tieneUsd ? 'both' : tieneUsd ? 'usd' : 'pen'

  hasGastosPen.value =
    tarjeta.montoDeudaActual > 0 ||
    (tarjeta.saldoTotal != null && tarjeta.saldoTotal > 0) ||
    (tarjeta.pagoMinimo != null && tarjeta.pagoMinimo > 0) ||
    tienePen
  hasGastosUsd.value =
    (tarjeta.montoDeudaActualUsd != null && tarjeta.montoDeudaActualUsd > 0) ||
    (tarjeta.saldoTotalUsd != null && tarjeta.saldoTotalUsd > 0) ||
    (tarjeta.pagoMinimoUsd != null && tarjeta.pagoMinimoUsd > 0) ||
    tieneUsd

  isModalOpen.value = true
}

function closeModal(): void {
  isModalOpen.value = false
  editingId.value = null
  resetForm()
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Tarjeta agregada correctamente')
    closeModal()
  }
})

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Tarjeta actualizada')
    closeModal()
  }
})

function handleSubmit(): void {
  formError.value = null

  if (!form.descripcion.trim()) {
    formError.value = 'La descripción es requerida'
    return
  }

  const lineaPenNum = hasLineaPen.value && form.lineaTotal ? parseMoneyInput(form.lineaTotal) : 0
  const lineaUsdNum = hasLineaUsd.value && form.lineaTotalUsd ? parseMoneyInput(form.lineaTotalUsd) : 0

  if (!(lineaPenNum > 0) && !(lineaUsdNum > 0)) {
    formError.value = 'Ingresá al menos una línea (soles o dólares)'
    return
  }

  const montoDeudaNum = hasGastosPen.value && form.montoDeudaActual ? parseMoneyInput(form.montoDeudaActual) : 0
  const pagoMinimoNum = hasGastosPen.value && form.pagoMinimo ? parseMoneyInput(form.pagoMinimo) : undefined
  const saldoTotalNum = hasGastosPen.value && form.saldoTotal ? parseMoneyInput(form.saldoTotal) : undefined

  const montoDeudaUsdNum = hasGastosUsd.value && form.montoDeudaActualUsd ? parseMoneyInput(form.montoDeudaActualUsd) : 0
  const pagoMinimoUsdNum = hasGastosUsd.value && form.pagoMinimoUsd ? parseMoneyInput(form.pagoMinimoUsd) : undefined
  const saldoTotalUsdNum = hasGastosUsd.value && form.saldoTotalUsd ? parseMoneyInput(form.saldoTotalUsd) : undefined

  startLoading('#BE185D')

  if (editingId.value) {
    updateTarjeta(editingId.value, {
      descripcion: form.descripcion.trim(),
      lineaTotal: lineaPenNum,
      montoDeudaActual: montoDeudaNum,
      pagoMinimo: pagoMinimoNum,
      saldoTotal: saldoTotalNum,
      lineaTotalUsd: lineaUsdNum,
      montoDeudaActualUsd: montoDeudaUsdNum,
      pagoMinimoUsd: pagoMinimoUsdNum,
      saldoTotalUsd: saldoTotalUsdNum,
    })
  } else {
    addTarjeta({
      descripcion: form.descripcion.trim(),
      lineaTotal: lineaPenNum,
      montoDeudaActual: montoDeudaNum,
      pagoMinimo: pagoMinimoNum,
      saldoTotal: saldoTotalNum,
      lineaTotalUsd: lineaUsdNum || undefined,
      montoDeudaActualUsd: montoDeudaUsdNum || undefined,
      pagoMinimoUsd: pagoMinimoUsdNum,
      saldoTotalUsd: saldoTotalUsdNum,
    })
  }
}

const pendingDeleteId = ref<string | null>(null)

function handleDelete(id: string): void {
  pendingDeleteId.value = id
}

function confirmDelete(): void {
  if (pendingDeleteId.value) removeTarjeta(pendingDeleteId.value)
  pendingDeleteId.value = null
}

// ─── Payment ──────────────────────────────────────────────────────────────────
const payingId = ref<string | null>(null)
const payAmount = ref('')

function startPay(tarjeta: TarjetaCredito): void {
  editingId.value = null
  payingId.value = tarjeta.id
  payAmount.value = String(tarjeta.montoDeudaActual)
}

function cancelPay(): void {
  payingId.value = null
  payAmount.value = ''
}

function confirmPay(tarjetaId: string): void {
  const monto = parseMoneyInput(payAmount.value)
  if (isNaN(monto) || monto <= 0) return

  const today = new Date().toISOString().slice(0, 10)
  startLoading('#6A1E2D')
  addPago({ tarjetaId, monto, fecha: today })
}

watch(isAddingPago, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Pago registrado')
    payingId.value = null
    payAmount.value = ''
  }
})

function handleRemovePago(pagoId: string): void {
  removePago(pagoId)
}

defineExpose({ openModal })
</script>

<template>
  <div :class="embedded ? '' : 'min-h-screen bg-[#F0F2F5]'" data-testid="tarjetas-view">
    <div :class="embedded ? 'space-y-4' : 'max-w-5xl mx-auto p-5 lg:p-8 space-y-5'">
      <PageHeader
        v-if="!embedded"
        title="Tarjetas de Crédito"
        subtitle="Controla la utilización de tus tarjetas"
        button-label="Agregar tarjeta"
        button-color="#6A1E2D"
        button-testid="open-modal-button"
        @action="openModal"
      />

      <div
        v-if="!embedded"
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #6a1e2d 0%, #4a1520 100%)"
      >
        <div class="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-[0.08]" style="background: white"></div>
        <div class="absolute -bottom-14 -left-6 w-52 h-52 rounded-full opacity-[0.05]" style="background: white"></div>

        <div class="relative z-10">
          <div class="flex items-start justify-between gap-4 mb-5">
            <p class="text-white/60 text-xs font-semibold uppercase tracking-widest">Tarjetas de Crédito</p>
            <div class="shrink-0 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <CreditCard :size="24" class="text-white" aria-hidden="true" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white/15 rounded-2xl p-4" data-testid="total-tarjetas-card">
              <p class="text-white/50 text-xs mb-1">Pago del mes</p>
              <p class="text-2xl lg:text-3xl font-black text-white tracking-tight" data-testid="total-tarjetas">
                {{ formatCurrency(totalTarjetas) }}
              </p>
              <p class="text-white/40 text-xs mt-1">Utilización: {{ utilizacionTotal }}%</p>
            </div>
            <div class="bg-white/15 rounded-2xl p-4" data-testid="linea-total-card">
              <p class="text-white/50 text-xs mb-1">Línea total</p>
              <p class="text-2xl lg:text-3xl font-black text-white tracking-tight" data-testid="linea-total-combinada">
                {{ formatCurrency(lineaTotalCombinada) }}
              </p>
              <p class="text-white/40 text-xs mt-1">
                {{ tarjetas.length }} tarjeta{{ tarjetas.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="isLoading" class="text-center py-16 text-[#94A3B8]" data-testid="loading-state">Cargando...</div>

        <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #c65a3a" data-testid="error-state">
          Error al cargar las tarjetas
        </div>

        <EmptyState
          v-else-if="tarjetas.length === 0"
          :icon="Inbox"
          color="#BE185D"
          title="No hay tarjetas registradas"
          subtitle="Controlá el uso y pagos de tus tarjetas de crédito"
          action-label="Agregar tarjeta"
          testid="empty-state"
          @action="openModal"
        />

        <div v-else class="space-y-4" data-testid="tarjetas-list">
          <TarjetaCard
            v-for="tarjeta in tarjetas"
            :key="tarjeta.id"
            :tarjeta="tarjeta"
            :is-paying="payingId === tarjeta.id"
            :pay-amount="payAmount"
            :pagos="pagosDeTarjeta(tarjeta.id)"
            :is-confirming-pay="isAddingPago"
            @edit="startEdit"
            @delete="handleDelete"
            @pay="startPay"
            @update:pay-amount="payAmount = $event"
            @confirm-pay="confirmPay"
            @cancel-pay="cancelPay"
            @remove-pago="handleRemovePago"
          />
        </div>
      </div>
    </div>
  </div>

  <AppModal
    :open="isModalOpen"
    :title="isEditing ? 'Editar tarjeta' : 'Nueva tarjeta'"
    :subtitle="isEditing ? 'Actualizá los datos de la tarjeta' : 'Registrá una tarjeta de crédito'"
    accent-color="#BE185D"
    @close="closeModal"
  >
    <form data-testid="tarjetas-form" novalidate autocomplete="off" @submit.prevent="handleSubmit">
      <div class="space-y-5">
        <!-- Sección: Identificación -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Identificación</p>
          <div>
            <label for="descripcion-tarjeta" class="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre de la tarjeta
            </label>
            <input
              id="descripcion-tarjeta"
              v-model="form.descripcion"
              type="text"
              name="tarjeta-nombre"
              autocomplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Ej: Visa BCP"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-all"
              data-testid="descripcion-input"
            />
          </div>
        </div>

        <!-- Sección: Línea de crédito -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Línea de crédito</p>
          <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="tablist" data-testid="linea-currency-tabs">
            <button
              v-for="opt in ([
                { key: 'pen', label: 'Soles', badge: 'S/' },
                { key: 'usd', label: 'Dólares', badge: 'US$' },
                { key: 'both', label: 'Ambas', badge: 'S/ + US$' },
              ] as const)"
              :key="opt.key"
              type="button"
              role="tab"
              :aria-selected="lineaCurrency === opt.key"
              class="py-2 text-xs font-semibold rounded-lg transition-all"
              :class="lineaCurrency === opt.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              :data-testid="`linea-currency-${opt.key}`"
              @click="lineaCurrency = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>

          <div v-if="hasLineaPen">
            <label for="linea-total" class="block text-xs font-medium text-slate-600 mb-1.5">Línea en Soles</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
              <input
                id="linea-total"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :value="form.lineaTotal"
                placeholder="0.00"
                class="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 tabular-nums transition-all"
                data-testid="linea-total-input"
                @input="onDecimalInput($event, (v) => (form.lineaTotal = v))"
                @blur="form.lineaTotal = formatMoneyDisplay(form.lineaTotal)"
              />
            </div>
          </div>

          <div v-if="hasLineaUsd">
            <label for="linea-total-usd" class="block text-xs font-medium text-slate-600 mb-1.5">Línea en Dólares</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">US$</span>
              <input
                id="linea-total-usd"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :value="form.lineaTotalUsd"
                placeholder="0.00"
                class="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 tabular-nums transition-all"
                data-testid="linea-total-usd-input"
                @input="onDecimalInput($event, (v) => (form.lineaTotalUsd = v))"
                @blur="form.lineaTotalUsd = formatMoneyDisplay(form.lineaTotalUsd)"
              />
            </div>
          </div>
        </div>

        <!-- Sección: Gastos -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gastos / Deuda</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="py-2 text-xs font-semibold rounded-xl border transition-all"
              :class="hasGastosPen
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-emerald-700'"
              data-testid="toggle-gastos-pen"
              @click="hasGastosPen = !hasGastosPen"
            >
              {{ hasGastosPen ? '✓' : '+' }} Gastos en Soles
            </button>
            <button
              type="button"
              class="py-2 text-xs font-semibold rounded-xl border transition-all"
              :class="hasGastosUsd
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-sky-200 hover:text-sky-700'"
              data-testid="toggle-gastos-usd"
              @click="hasGastosUsd = !hasGastosUsd"
            >
              {{ hasGastosUsd ? '✓' : '+' }} Gastos en Dólares
            </button>
          </div>

          <!-- Gastos PEN -->
          <div v-if="hasGastosPen" class="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">En Soles</span>
              <span class="flex-1 h-px bg-emerald-200"></span>
              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded-full px-2 py-0.5">S/</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="monto-deuda-actual" class="block text-xs font-medium text-slate-600 mb-1.5">Pago del mes</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                  <input
                    id="monto-deuda-actual"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :value="form.montoDeudaActual"
                    placeholder="0.00"
                    class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 tabular-nums transition-all"
                    data-testid="monto-deuda-input"
                    @input="onDecimalInput($event, (v) => (form.montoDeudaActual = v))"
                    @blur="form.montoDeudaActual = formatMoneyDisplay(form.montoDeudaActual)"
                  />
                </div>
              </div>
              <div>
                <label for="pago-minimo" class="block text-xs font-medium text-slate-600 mb-1.5">
                  Pago mínimo <span class="text-slate-400">· opc.</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                  <input
                    id="pago-minimo"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :value="form.pagoMinimo"
                    placeholder="0.00"
                    class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 tabular-nums transition-all"
                    data-testid="pago-minimo-input"
                    @input="onDecimalInput($event, (v) => (form.pagoMinimo = v))"
                    @blur="form.pagoMinimo = formatMoneyDisplay(form.pagoMinimo)"
                  />
                </div>
              </div>
            </div>
            <div>
              <label for="saldo-total" class="block text-xs font-medium text-slate-600 mb-1.5">
                Deuda total <span class="text-slate-400">· opc.</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                <input
                  id="saldo-total"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.saldoTotal"
                  placeholder="0.00"
                  class="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 tabular-nums transition-all"
                  data-testid="saldo-total-input"
                  @input="onDecimalInput($event, (v) => (form.saldoTotal = v))"
                  @blur="form.saldoTotal = formatMoneyDisplay(form.saldoTotal)"
                />
              </div>
            </div>
          </div>

          <!-- Gastos USD -->
          <div v-if="hasGastosUsd" class="space-y-2 rounded-xl border border-sky-200 bg-sky-50/40 p-3">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">En Dólares</span>
              <span class="flex-1 h-px bg-sky-200"></span>
              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-white border border-sky-200 rounded-full px-2 py-0.5">US$</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="monto-deuda-usd" class="block text-xs font-medium text-slate-600 mb-1.5">Pago del mes</label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">US$</span>
                  <input
                    id="monto-deuda-usd"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :value="form.montoDeudaActualUsd"
                    placeholder="0.00"
                    class="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 tabular-nums transition-all"
                    data-testid="monto-deuda-usd-input"
                    @input="onDecimalInput($event, (v) => (form.montoDeudaActualUsd = v))"
                    @blur="form.montoDeudaActualUsd = formatMoneyDisplay(form.montoDeudaActualUsd)"
                  />
                </div>
              </div>
              <div>
                <label for="pago-minimo-usd" class="block text-xs font-medium text-slate-600 mb-1.5">
                  Mínimo <span class="text-slate-400">· opc.</span>
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">US$</span>
                  <input
                    id="pago-minimo-usd"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :value="form.pagoMinimoUsd"
                    placeholder="0.00"
                    class="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 tabular-nums transition-all"
                    data-testid="pago-minimo-usd-input"
                    @input="onDecimalInput($event, (v) => (form.pagoMinimoUsd = v))"
                    @blur="form.pagoMinimoUsd = formatMoneyDisplay(form.pagoMinimoUsd)"
                  />
                </div>
              </div>
            </div>
            <div>
              <label for="saldo-total-usd" class="block text-xs font-medium text-slate-600 mb-1.5">
                Deuda total <span class="text-slate-400">· opc.</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">US$</span>
                <input
                  id="saldo-total-usd"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.saldoTotalUsd"
                  placeholder="0.00"
                  class="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 tabular-nums transition-all"
                  data-testid="saldo-total-usd-input"
                  @input="onDecimalInput($event, (v) => (form.saldoTotalUsd = v))"
                  @blur="form.saldoTotalUsd = formatMoneyDisplay(form.saldoTotalUsd)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Saldo disponible (auto) -->
        <div
          class="px-4 py-3 rounded-xl border"
          style="background: linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%); border-color: rgba(190, 24, 93, 0.15);"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-900/60">Saldo disponible</p>
              <p class="text-[10px] text-rose-900/50">Calculado automáticamente</p>
            </div>
            <div class="text-right space-y-0.5">
              <p
                v-if="hasLineaPen && form.lineaTotal"
                class="text-base font-black tabular-nums tracking-tight"
                style="color: #9F1239"
              >
                {{
                  form.saldoTotal
                    ? formatCurrency(parseMoneyInput(form.lineaTotal) - parseMoneyInput(form.saldoTotal))
                    : formatCurrency(
                        parseMoneyInput(form.lineaTotal) -
                          (form.montoDeudaActual ? parseMoneyInput(form.montoDeudaActual) : 0),
                      )
                }}
              </p>
              <p
                v-if="hasLineaUsd && form.lineaTotalUsd"
                class="text-sm font-bold tabular-nums text-sky-700"
              >
                {{
                  form.saldoTotalUsd
                    ? formatUsd(parseMoneyInput(form.lineaTotalUsd) - parseMoneyInput(form.saldoTotalUsd))
                    : formatUsd(
                        parseMoneyInput(form.lineaTotalUsd) -
                          (form.montoDeudaActualUsd ? parseMoneyInput(form.montoDeudaActualUsd) : 0),
                      )
                }}
              </p>
              <p
                v-if="(!hasLineaPen || !form.lineaTotal) && (!hasLineaUsd || !form.lineaTotalUsd)"
                class="text-base font-black tabular-nums tracking-tight text-rose-900/40"
              >—</p>
            </div>
          </div>
        </div>

        <p
          v-if="formError"
          class="text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-rose-700"
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all"
          @click="closeModal"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isAdding || isUpdating"
          class="flex-[2] py-2.5 text-sm text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #BE185D 0%, #9F1239 100%);"
          data-testid="submit-button"
          @click="handleSubmit"
        >
          {{
            isEditing
              ? isUpdating
                ? 'Guardando…'
                : 'Guardar cambios'
              : isAdding
                ? 'Agregando…'
                : 'Agregar tarjeta'
          }}
        </button>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="pendingDeleteId !== null"
    @confirm="confirmDelete"
    @cancel="pendingDeleteId = null"
  />
</template>
