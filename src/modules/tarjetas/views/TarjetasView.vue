<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { CreditCard, Inbox } from 'lucide-vue-next'
import { useTarjetas } from '../composables/useTarjetas'
import { useTarjetaPagos } from '../composables/useTarjetaPagos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import TarjetaCard from '../components/TarjetaCard.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import type { TarjetaCredito } from '../types'

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

const form = reactive({ lineaTotal: '', montoDeudaActual: '', pagoMinimo: '', saldoTotal: '', descripcion: '' })
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

const utilizacionTotal = computed(() =>
  lineaTotalCombinada.value > 0 ? Math.round((totalTarjetas.value / lineaTotalCombinada.value) * 100) : 0,
)

function openModal(): void {
  formError.value = null
  isModalOpen.value = true
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Tarjeta agregada correctamente')
    isModalOpen.value = false
  }
})

function handleSubmit(): void {
  formError.value = null
  const lineaTotalNum = parseMoneyInput(form.lineaTotal)
  const montoDeudaNum = parseMoneyInput(form.montoDeudaActual)
  const pagoMinimoNum = form.pagoMinimo ? parseMoneyInput(form.pagoMinimo) : undefined
  const saldoTotalNum = form.saldoTotal ? parseMoneyInput(form.saldoTotal) : undefined

  if (!form.descripcion.trim()) {
    formError.value = 'La descripción es requerida'
    return
  }
  if (isNaN(lineaTotalNum) || lineaTotalNum <= 0) {
    formError.value = 'La línea total debe ser un número positivo'
    return
  }
  if (isNaN(montoDeudaNum) || montoDeudaNum < 0) {
    formError.value = 'El monto de deuda debe ser un número mayor o igual a 0'
    return
  }

  startLoading('#6A1E2D')
  addTarjeta({
    lineaTotal: lineaTotalNum,
    montoDeudaActual: montoDeudaNum,
    pagoMinimo: pagoMinimoNum,
    saldoTotal: saldoTotalNum,
    descripcion: form.descripcion.trim(),
  })
  Object.assign(form, { lineaTotal: '', montoDeudaActual: '', pagoMinimo: '', saldoTotal: '', descripcion: '' })
}

function handleDelete(id: string): void {
  removeTarjeta(id)
}

const editingId = ref<string | null>(null)
const editForm = reactive({ descripcion: '', lineaTotal: '', montoDeudaActual: '', pagoMinimo: '', saldoTotal: '' })

function startEdit(tarjeta: TarjetaCredito): void {
  payingId.value = null
  editingId.value = tarjeta.id
  editForm.descripcion = tarjeta.descripcion
  editForm.lineaTotal = String(tarjeta.lineaTotal)
  editForm.montoDeudaActual = String(tarjeta.montoDeudaActual)
  editForm.pagoMinimo = tarjeta.pagoMinimo != null ? String(tarjeta.pagoMinimo) : ''
  editForm.saldoTotal = tarjeta.saldoTotal != null ? String(tarjeta.saldoTotal) : ''
}

function cancelEdit(): void {
  editingId.value = null
}

function saveEdit(id: string): void {
  const lineaTotalNum = parseMoneyInput(editForm.lineaTotal)
  const montoDeudaNum = parseMoneyInput(editForm.montoDeudaActual)
  const pagoMinimoNum = editForm.pagoMinimo ? parseMoneyInput(editForm.pagoMinimo) : undefined
  const saldoTotalNum = editForm.saldoTotal ? parseMoneyInput(editForm.saldoTotal) : undefined
  updateTarjeta(id, {
    descripcion: editForm.descripcion.trim() || undefined,
    lineaTotal: isNaN(lineaTotalNum) ? undefined : lineaTotalNum,
    montoDeudaActual: isNaN(montoDeudaNum) ? undefined : montoDeudaNum,
    pagoMinimo: pagoMinimoNum,
    saldoTotal: saldoTotalNum,
  })
}

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    editingId.value = null
    showToast('Tarjeta actualizada')
  }
})

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
</script>

<template>
  <div class="min-h-screen bg-[#F0F2F5]" data-testid="tarjetas-view">
    <div class="max-w-5xl mx-auto p-5 lg:p-8 space-y-5">
      <PageHeader
        title="Tarjetas de Crédito"
        subtitle="Controla la utilización de tus tarjetas"
        button-label="Agregar tarjeta"
        button-color="#6A1E2D"
        button-testid="open-modal-button"
        @action="openModal"
      />

      <div
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
          color="#6A1E2D"
          title="No hay tarjetas registradas"
          subtitle="Agrega tu primera tarjeta de crédito"
          testid="empty-state"
        />

        <div v-else class="space-y-4" data-testid="tarjetas-list">
          <TarjetaCard
            v-for="tarjeta in tarjetas"
            :key="tarjeta.id"
            :tarjeta="tarjeta"
            :is-editing="editingId === tarjeta.id"
            :edit-form="editForm"
            :is-updating="isUpdating"
            :is-paying="payingId === tarjeta.id"
            :pay-amount="payAmount"
            :pagos="pagosDeTarjeta(tarjeta.id)"
            :is-confirming-pay="isAddingPago"
            @edit="startEdit"
            @delete="handleDelete"
            @save="saveEdit"
            @cancel="cancelEdit"
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

  <AppModal :open="isModalOpen" title="Agregar Tarjeta" accent-color="#6A1E2D" @close="isModalOpen = false">
    <form data-testid="tarjetas-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label
            for="descripcion-tarjeta"
            class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
          >
            Descripción
          </label>
          <input
            id="descripcion-tarjeta"
            v-model="form.descripcion"
            type="text"
            placeholder="Ej: Visa BCP"
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="descripcion-input"
          />
        </div>

        <div>
          <label for="linea-total" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
            Línea total (S/)
          </label>
          <input
            id="linea-total"
            type="text"
            inputmode="decimal"
            :value="form.lineaTotal"
            placeholder="0.00"
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="linea-total-input"
            @input="onDecimalInput($event, (v) => (form.lineaTotal = v))"
            @blur="form.lineaTotal = formatMoneyDisplay(form.lineaTotal)"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              for="monto-deuda-actual"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Pago del mes (S/)
            </label>
            <input
              id="monto-deuda-actual"
              type="text"
              inputmode="decimal"
              :value="form.montoDeudaActual"
              placeholder="0.00"
              class="w-full px-3 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:border-transparent focus:bg-white transition-all"
              data-testid="monto-deuda-input"
              @input="onDecimalInput($event, (v) => (form.montoDeudaActual = v))"
              @blur="form.montoDeudaActual = formatMoneyDisplay(form.montoDeudaActual)"
            />
          </div>
          <div>
            <label for="pago-minimo" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
              Pago mínimo (S/) <span class="font-normal normal-case text-[#94A3B8]">(opc.)</span>
            </label>
            <input
              id="pago-minimo"
              type="text"
              inputmode="decimal"
              :value="form.pagoMinimo"
              placeholder="0.00"
              class="w-full px-3 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:border-transparent focus:bg-white transition-all"
              data-testid="pago-minimo-input"
              @input="onDecimalInput($event, (v) => (form.pagoMinimo = v))"
              @blur="form.pagoMinimo = formatMoneyDisplay(form.pagoMinimo)"
            />
          </div>
        </div>

        <div>
          <label for="saldo-total" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
            Deuda total (S/) <span class="font-normal normal-case text-[#94A3B8]">(opc.)</span>
          </label>
          <input
            id="saldo-total"
            type="text"
            inputmode="decimal"
            :value="form.saldoTotal"
            placeholder="0.00"
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="saldo-total-input"
            @input="onDecimalInput($event, (v) => (form.saldoTotal = v))"
            @blur="form.saldoTotal = formatMoneyDisplay(form.saldoTotal)"
          />
        </div>

        <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F5F6FA] border border-[#EEEEF0]">
          <span class="text-xs text-[#64748B]">Saldo disponible (auto)</span>
          <span class="text-sm font-bold" style="color: #6a1e2d">
            {{
              form.lineaTotal && form.saldoTotal
                ? formatCurrency(parseMoneyInput(form.lineaTotal) - parseMoneyInput(form.saldoTotal))
                : form.lineaTotal
                  ? formatCurrency(
                      parseMoneyInput(form.lineaTotal) -
                        (form.montoDeudaActual ? parseMoneyInput(form.montoDeudaActual) : 0),
                    )
                  : '—'
            }}
          </span>
        </div>

        <p
          v-if="formError"
          class="text-sm bg-[#C65A3A]/8 border border-[#C65A3A]/20 rounded-xl px-3 py-2.5"
          style="color: #c65a3a"
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          :disabled="isAdding"
          class="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #6a1e2d 0%, #4a1520 100%)"
          data-testid="submit-button"
        >
          {{ isAdding ? 'Agregando...' : '+ Agregar tarjeta' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>
