<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import { ref } from 'vue'
import { CreditCard, Trash2, Pencil, Check, X, Banknote, ChevronDown, ChevronUp } from 'lucide-vue-next'
import type { TarjetaCredito, TarjetaPago } from '../types'
import CurrencyInput from '~/shared/components/ui/CurrencyInput.vue'

defineProps<{
  tarjeta: TarjetaCredito
  isEditing: boolean
  editForm: {
    descripcion: string
    lineaTotal: string
    montoDeudaActual: string
    pagoMinimo: string
    saldoTotal: string
  }
  isUpdating: boolean
  isPaying: boolean
  payAmount: string
  pagos: TarjetaPago[]
  isConfirmingPay: boolean
}>()

const emit = defineEmits<{
  edit: [tarjeta: TarjetaCredito]
  delete: [id: string]
  save: [id: string]
  cancel: []
  pay: [tarjeta: TarjetaCredito]
  'update:payAmount': [value: string]
  'confirm-pay': [id: string]
  'cancel-pay': []
  'remove-pago': [pagoId: string]
}>()

const historialOpen = ref(false)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function utilizacion(lineaTotal: number, montoDeuda: number): number {
  return lineaTotal > 0 ? Math.round((montoDeuda / lineaTotal) * 100) : 0
}

function utilizacionColor(pct: number): string {
  if (pct >= 80) return '#C65A3A'
  if (pct >= 50) return '#D4A017'
  return '#6A9EC8'
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm p-5" data-testid="tarjeta-item">
    <template v-if="isEditing">
      <div class="space-y-3">
        <input
          v-model="editForm.descripcion"
          type="text"
          placeholder="Descripción"
          class="w-full px-3 py-2 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6A1E2D]/30 focus:bg-white transition-all"
          data-testid="edit-descripcion"
        />

        <CurrencyInput
          :model-value="editForm.lineaTotal"
          label="Línea total (S/)"
          accent-color="#6A1E2D"
          testid="edit-linea-total"
          @update:model-value="editForm.lineaTotal = $event"
        />

        <div class="grid grid-cols-2 gap-3">
          <CurrencyInput
            :model-value="editForm.montoDeudaActual"
            label="Pago del mes (S/)"
            accent-color="#6A1E2D"
            testid="edit-monto-deuda"
            @update:model-value="editForm.montoDeudaActual = $event"
          />
          <CurrencyInput
            :model-value="editForm.saldoTotal"
            label="Deuda total (S/)"
            accent-color="#6A1E2D"
            testid="edit-saldo-total"
            @update:model-value="editForm.saldoTotal = $event"
          />
        </div>

        <CurrencyInput
          :model-value="editForm.pagoMinimo"
          label="Pago mínimo (S/)"
          accent-color="#6A1E2D"
          testid="edit-pago-minimo"
          @update:model-value="editForm.pagoMinimo = $event"
        />

        <div class="flex gap-2 pt-1">
          <button
            type="button"
            :disabled="isUpdating"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style="background: linear-gradient(135deg, #6a1e2d 0%, #4a1520 100%)"
            data-testid="save-edit-button"
            @click="emit('save', tarjeta.id)"
          >
            <Check :size="13" />
            {{ isUpdating ? 'Guardando…' : 'Guardar' }}
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] bg-[#F0F2F5] hover:bg-[#E2E8F0] transition-all"
            data-testid="cancel-edit-button"
            @click="emit('cancel')"
          >
            <X :size="13" />
            Cancelar
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style="background: rgba(106, 30, 45, 0.1)"
            aria-hidden="true"
          >
            <CreditCard :size="18" style="color: #6a1e2d" />
          </div>
          <div>
            <p class="font-semibold text-[#1A1A2E]" data-testid="tarjeta-descripcion">
              {{ tarjeta.descripcion }}
            </p>
            <p class="text-xs text-[#94A3B8]">
              Línea: <strong data-testid="tarjeta-linea">{{ formatCurrency(tarjeta.lineaTotal) }}</strong>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#6A1E2D] hover:bg-[#6A1E2D]/8 transition-colors"
            :aria-label="`Pagar tarjeta ${tarjeta.descripcion}`"
            data-testid="pay-button"
            @click="emit('pay', tarjeta)"
          >
            <Banknote :size="14" />
          </button>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#6A1E2D] hover:bg-[#6A1E2D]/8 transition-colors"
            :aria-label="`Editar tarjeta ${tarjeta.descripcion}`"
            data-testid="edit-button"
            @click="emit('edit', tarjeta)"
          >
            <Pencil :size="14" />
          </button>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-colors"
            :aria-label="`Eliminar tarjeta ${tarjeta.descripcion}`"
            data-testid="delete-button"
            @click="emit('delete', tarjeta.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex justify-between text-xs text-[#94A3B8] mb-1.5">
          <span>Utilización del crédito</span>
          <span
            class="font-semibold"
            :style="{ color: utilizacionColor(utilizacion(tarjeta.lineaTotal, tarjeta.montoDeudaActual)) }"
          >
            {{ utilizacion(tarjeta.lineaTotal, tarjeta.montoDeudaActual) }}%
          </span>
        </div>
        <div class="h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :style="{
              width: `${Math.min(utilizacion(tarjeta.lineaTotal, tarjeta.montoDeudaActual), 100)}%`,
              backgroundColor: utilizacionColor(utilizacion(tarjeta.lineaTotal, tarjeta.montoDeudaActual)),
            }"
          ></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0F2F5]">
        <div class="bg-[#F0F2F5] rounded-xl p-2.5">
          <p class="text-xs text-[#94A3B8] mb-0.5">Pago del mes</p>
          <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-deuda">
            {{ formatCurrency(tarjeta.montoDeudaActual) }}
          </p>
        </div>
        <div class="bg-[#F0F2F5] rounded-xl p-2.5">
          <p class="text-xs text-[#94A3B8] mb-0.5">Deuda total</p>
          <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-saldo-total">
            {{ tarjeta.saldoTotal != null ? formatCurrency(tarjeta.saldoTotal) : '—' }}
          </p>
        </div>
        <div class="bg-[#F0F2F5] rounded-xl p-2.5">
          <p class="text-xs text-[#94A3B8] mb-0.5">Pago mínimo</p>
          <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-pago-minimo">
            {{ tarjeta.pagoMinimo != null ? formatCurrency(tarjeta.pagoMinimo) : '—' }}
          </p>
        </div>
        <div class="rounded-xl p-2.5" style="background: rgba(106, 30, 45, 0.08)">
          <p class="text-xs mb-0.5" style="color: #6a1e2d">Saldo disponible</p>
          <p class="text-sm font-bold" style="color: #6a1e2d">
            {{ formatCurrency(tarjeta.lineaTotal - (tarjeta.saldoTotal ?? tarjeta.montoDeudaActual)) }}
          </p>
        </div>
      </div>

      <div v-if="isPaying" class="mt-3 pt-3 border-t border-[#F0F2F5]" data-testid="pay-form">
        <p class="text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wide">Registrar pago</p>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <CurrencyInput
              :model-value="payAmount"
              label="Monto (S/)"
              accent-color="#6A1E2D"
              testid="pay-amount-input"
              @update:model-value="emit('update:payAmount', $event)"
            />
          </div>
          <button
            type="button"
            :disabled="isConfirmingPay"
            class="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
            style="background: linear-gradient(135deg, #6a1e2d 0%, #4a1520 100%)"
            data-testid="confirm-pay-button"
            @click="emit('confirm-pay', tarjeta.id)"
          >
            <Check :size="13" />
            {{ isConfirmingPay ? 'Pagando…' : 'Confirmar' }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center w-10 h-10 rounded-xl text-[#64748B] bg-[#F0F2F5] hover:bg-[#E2E8F0] transition-all shrink-0"
            data-testid="cancel-pay-button"
            @click="emit('cancel-pay')"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <div v-if="pagos.length > 0" class="mt-3 pt-3 border-t border-[#F0F2F5]" data-testid="pagos-historial">
        <button
          class="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1A1A2E] transition-colors w-full"
          data-testid="toggle-historial"
          @click="historialOpen = !historialOpen"
        >
          <component :is="historialOpen ? ChevronUp : ChevronDown" :size="14" />
          Historial de pagos ({{ pagos.length }})
        </button>
        <div v-if="historialOpen" class="mt-2 space-y-1.5" data-testid="historial-list">
          <div
            v-for="pago in pagos"
            :key="pago.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F5F6FA] text-sm"
            data-testid="pago-item"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs text-[#94A3B8]">{{ formatDate(pago.fecha) }}</span>
              <span class="font-semibold text-[#1A1A2E]">{{ formatCurrency(pago.monto) }}</span>
            </div>
            <button
              class="w-6 h-6 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-colors"
              :aria-label="`Eliminar pago de ${formatCurrency(pago.monto)}`"
              data-testid="remove-pago-button"
              @click="$emit('remove-pago', pago.id)"
            >
              <X :size="12" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
