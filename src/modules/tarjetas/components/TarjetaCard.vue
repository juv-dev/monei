<script setup lang="ts">
import { ref } from 'vue'
import { CreditCard, Trash2, Pencil, Check, X, Banknote, ChevronDown, ChevronUp } from 'lucide-vue-next'
import type { TarjetaCredito, TarjetaPago } from '../types'
import CurrencyInput from '~/shared/components/ui/CurrencyInput.vue'

defineProps<{
  tarjeta: TarjetaCredito
  isPaying: boolean
  payAmount: string
  pagos: TarjetaPago[]
  isConfirmingPay: boolean
}>()

const emit = defineEmits<{
  edit: [tarjeta: TarjetaCredito]
  delete: [id: string]
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

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
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
              Línea:
              <strong
                v-if="tarjeta.lineaTotal > 0"
                data-testid="tarjeta-linea"
              >{{ formatCurrency(tarjeta.lineaTotal) }}</strong>
              <template v-if="tarjeta.lineaTotal > 0 && tarjeta.lineaTotalUsd != null && tarjeta.lineaTotalUsd > 0">
                <span class="text-[#CBD5E1]"> · </span>
              </template>
              <strong
                v-if="tarjeta.lineaTotalUsd != null && tarjeta.lineaTotalUsd > 0"
                class="text-sky-700"
                data-testid="tarjeta-linea-usd"
              >{{ formatUsd(tarjeta.lineaTotalUsd) }}</strong>
              <strong v-if="tarjeta.lineaTotal === 0 && (tarjeta.lineaTotalUsd == null || tarjeta.lineaTotalUsd === 0)">
                —
              </strong>
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

      <div v-if="tarjeta.lineaTotal > 0" class="mb-4">
        <div class="flex justify-between text-xs text-[#94A3B8] mb-1.5">
          <span>Utilización del crédito (S/)</span>
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

      <div
        v-if="tarjeta.lineaTotal > 0"
        class="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0F2F5]"
      >
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

      <div
        v-else-if="tarjeta.montoDeudaActual > 0 || (tarjeta.saldoTotal != null && tarjeta.saldoTotal > 0) || (tarjeta.pagoMinimo != null && tarjeta.pagoMinimo > 0)"
        class="pt-1 border-t border-[#F0F2F5]"
      >
        <p class="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Gastos en Soles</p>
        <div class="grid grid-cols-3 gap-2">
          <div v-if="tarjeta.montoDeudaActual > 0" class="bg-emerald-50/60 rounded-xl p-2.5">
            <p class="text-xs text-[#94A3B8] mb-0.5">Pago del mes</p>
            <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-deuda">
              {{ formatCurrency(tarjeta.montoDeudaActual) }}
            </p>
          </div>
          <div v-if="tarjeta.saldoTotal != null && tarjeta.saldoTotal > 0" class="bg-emerald-50/60 rounded-xl p-2.5">
            <p class="text-xs text-[#94A3B8] mb-0.5">Deuda total</p>
            <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-saldo-total">
              {{ formatCurrency(tarjeta.saldoTotal) }}
            </p>
          </div>
          <div v-if="tarjeta.pagoMinimo != null && tarjeta.pagoMinimo > 0" class="bg-emerald-50/60 rounded-xl p-2.5">
            <p class="text-xs text-[#94A3B8] mb-0.5">Pago mínimo</p>
            <p class="text-sm font-bold text-[#1A1A2E]" data-testid="tarjeta-pago-minimo">
              {{ formatCurrency(tarjeta.pagoMinimo) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Bloque USD (opcional) -->
      <div
        v-if="tarjeta.lineaTotalUsd != null && tarjeta.lineaTotalUsd > 0"
        class="mt-3 pt-3 border-t border-dashed border-sky-200"
        data-testid="tarjeta-usd-block"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">US$</span>
          <span class="text-xs font-semibold text-slate-600">Línea en dólares</span>
          <span class="ml-auto text-xs text-slate-500">
            Línea: <strong class="text-slate-800">{{ formatUsd(tarjeta.lineaTotalUsd) }}</strong>
          </span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div class="bg-sky-50/70 rounded-lg p-2">
            <p class="text-[10px] text-sky-700/80 mb-0.5">Pago mes</p>
            <p class="text-xs font-bold text-sky-900 tabular-nums">
              {{ tarjeta.montoDeudaActualUsd != null ? formatUsd(tarjeta.montoDeudaActualUsd) : '—' }}
            </p>
          </div>
          <div class="bg-sky-50/70 rounded-lg p-2">
            <p class="text-[10px] text-sky-700/80 mb-0.5">Deuda total</p>
            <p class="text-xs font-bold text-sky-900 tabular-nums">
              {{ tarjeta.saldoTotalUsd != null ? formatUsd(tarjeta.saldoTotalUsd) : '—' }}
            </p>
          </div>
          <div class="bg-sky-50/70 rounded-lg p-2">
            <p class="text-[10px] text-sky-700/80 mb-0.5">Mínimo</p>
            <p class="text-xs font-bold text-sky-900 tabular-nums">
              {{ tarjeta.pagoMinimoUsd != null ? formatUsd(tarjeta.pagoMinimoUsd) : '—' }}
            </p>
          </div>
          <div class="rounded-lg p-2" style="background: rgba(14, 165, 233, 0.12)">
            <p class="text-[10px] text-sky-700/80 mb-0.5">Disponible</p>
            <p class="text-xs font-bold text-sky-800 tabular-nums">
              {{ formatUsd(tarjeta.lineaTotalUsd - (tarjeta.saldoTotalUsd ?? tarjeta.montoDeudaActualUsd ?? 0)) }}
            </p>
          </div>
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
  </div>
</template>
