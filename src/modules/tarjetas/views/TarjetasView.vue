<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { CreditCard, Trash2 } from 'lucide-vue-next'
import { useTarjetas } from '../composables/useTarjetas'
import { useTarjetaPagos } from '../composables/useTarjetaPagos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import type { TarjetaCredito } from '../types'
import AppModal from '~/shared/components/ui/AppModal.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'

const {
  tarjetas,
  isLoading,
  isError,
  totalTarjetas,
  lineaTotalCombinada,
  pagoMensualTotal,
  addTarjeta,
  removeTarjeta,
  updateTarjeta,
  isAdding,
  isUpdating,
} = useTarjetas()

const { addPago, removePago, isAddingPago, pagosDeTarjeta } = useTarjetaPagos()

const openHistorial = ref<Record<string, boolean>>({})

function toggleHistorial(id: string): void {
  openHistorial.value[id] = !openHistorial.value[id]
}

const { startLoading, finishLoading, showToast } = useAppFeedback()

const cardGrads = [
  'linear-gradient(145deg,#1F4A45 0%,#0F2B28 100%)',
  'linear-gradient(145deg,#3A332A 0%,#211C16 100%)',
  'linear-gradient(145deg,#1C3357 0%,#0E1C32 100%)',
  'linear-gradient(145deg,#43243C 0%,#26101F 100%)',
]

function fmtSoles(n: number): string {
  return 'S/ ' + Math.round(Math.abs(n)).toLocaleString('es-PE')
}

function fmtUsd(n: number): string {
  return '$ ' + Math.round(Math.abs(n)).toLocaleString('en-US')
}

function isUsdCard(t: TarjetaCredito): boolean {
  return t.lineaTotal === 0 && (t.lineaTotalUsd ?? 0) > 0
}

function fmtTarjeta(t: TarjetaCredito): string {
  return isUsdCard(t) ? fmtUsd(t.montoDeudaActualUsd ?? 0) : fmtSoles(t.montoDeudaActual)
}

function fmtLinea(t: TarjetaCredito): string {
  return isUsdCard(t) ? fmtUsd(t.lineaTotalUsd ?? 0) : fmtSoles(t.lineaTotal)
}

function utilPct(t: TarjetaCredito): number {
  if (isUsdCard(t)) {
    return (t.lineaTotalUsd ?? 0) > 0 ? Math.round(((t.montoDeudaActualUsd ?? 0) / t.lineaTotalUsd!) * 100) : 0
  }
  return t.lineaTotal > 0 ? Math.round(((t.saldoTotal ?? t.montoDeudaActual) / t.lineaTotal) * 100) : 0
}

function utilWidth(t: TarjetaCredito): string {
  return Math.min(utilPct(t), 100) + '%'
}

function utilColor(t: TarjetaCredito): string {
  const pct = utilPct(t)
  return pct >= 80 ? '#C65A3A' : pct >= 50 ? '#D4A017' : '#6A9EC8'
}

const utilizacionTotal = computed(() =>
  lineaTotalCombinada.value > 0 ? Math.round((totalTarjetas.value / lineaTotalCombinada.value) * 100) : 0,
)

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

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
  <div class="min-h-full bg-[#F8F6F1]" data-testid="tarjetas-view">
    <div style="padding: 62px 18px 110px;">

      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 15px;">
        <div>
          <p style="margin: 0; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: #1C1A15;">Tarjetas</p>
          <p style="margin: 3px 0 0; font-size: 12px; color: #9A9384; font-weight: 500;">Líneas, saldos y disponible</p>
        </div>
        <button
          data-testid="open-modal-button"
          style="background: linear-gradient(135deg, #D06A8E, #A8315B); color: #fff; border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 700; box-shadow: 0 6px 14px -4px rgba(168,49,91,.4); border: none; cursor: pointer; white-space: nowrap;"
          @click="openModal"
        >
          + Agregar
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-16" style="color: #9A9384;" data-testid="loading-state">Cargando...</div>

      <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #C25A4E;" data-testid="error-state">Error al cargar las tarjetas</div>

      <template v-else>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 13px;">
          <div data-testid="total-tarjetas-card" style="border-radius: 16px; padding: 13px; background: linear-gradient(135deg, #FBE6EC, #F5D2DC); border: 1px solid rgba(168,49,91,.18);">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 7px;">
              <div style="width: 24px; height: 24px; border-radius: 7px; background: rgba(168,49,91,.16); display: flex; align-items: center; justify-content: center;">
                <CreditCard :size="13" style="color: #A8315B;" aria-hidden="true" />
              </div>
              <p style="font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #A8315B; text-transform: uppercase; margin: 0;">Pago del mes</p>
            </div>
            <p style="font-size: 19px; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: #1C1A15;">{{ fmtSoles(pagoMensualTotal) }}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #A8315B; font-weight: 600;">{{ tarjetas.length }} tarjetas</p>
            <span class="sr-only" data-testid="total-tarjetas">{{ formatCurrency(totalTarjetas) }}</span>
          </div>

          <div data-testid="linea-total-card" style="background: #fff; border: 1px solid #E7E0D2; border-radius: 16px; padding: 13px;">
            <p style="font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #9A9384; text-transform: uppercase; margin: 0 0 7px;">Saldo total</p>
            <p style="margin: 0; font-size: 19px; font-weight: 600; color: #1C1A15;">{{ fmtSoles(totalTarjetas) }}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #9A9384; font-weight: 600;">Línea {{ fmtSoles(lineaTotalCombinada) }}</p>
            <span class="sr-only" data-testid="linea-total-combinada">{{ formatCurrency(lineaTotalCombinada) }}</span>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #E7E0D2; border-radius: 16px; padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: #9A9384; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;">Uso de línea total</span>
            <span style="font-size: 13px; font-weight: 600; color: #A8315B;">{{ utilizacionTotal }}% uso</span>
          </div>
          <div style="height: 9px; border-radius: 999px; background: #F0EBE0; overflow: hidden;">
            <div :style="{ width: Math.min(utilizacionTotal, 100) + '%', background: 'linear-gradient(90deg,#D06A8E,#A8315B)', height: '100%', borderRadius: '999px' }"></div>
          </div>
        </div>

        <div v-if="tarjetas.length === 0" style="background: #fff; border: 1px solid #E7E0D2; border-radius: 22px; padding: 40px 24px; text-align: center; box-shadow: 0 1px 3px rgba(28,26,21,.05);" data-testid="empty-state">
          <div style="width: 54px; height: 54px; border-radius: 16px; background: #FBE6EC; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
            <CreditCard :size="26" style="color: #A8315B;" aria-hidden="true" />
          </div>
          <p style="font-size: 15px; font-weight: 800; margin: 0; color: #1C1A15;">No tenés tarjetas</p>
          <p style="margin: 5px 0 16px; font-size: 12px; color: #9A9384;">Agregá una tarjeta para controlar tu cupo</p>
          <button
            style="background: linear-gradient(135deg, #D06A8E, #A8315B); color: #fff; border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 700; box-shadow: 0 6px 14px -4px rgba(168,49,91,.4); border: none; cursor: pointer;"
            @click="openModal"
          >
            Agregar tarjeta
          </button>
        </div>

        <div v-else data-testid="tarjetas-list">
          <div
            v-for="(tarjeta, idx) in tarjetas"
            :key="tarjeta.id"
            style="margin-bottom: 13px;"
            data-testid="tarjeta-item"
          >
            <div :style="{ borderRadius: '20px 20px 0 0', padding: '16px', background: cardGrads[idx % 4], color: '#F1ECE1', position: 'relative', overflow: 'hidden' }">
              <div style="position: absolute; top: -30px; right: -20px; width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle,rgba(255,255,255,.14),transparent 70%); pointer-events: none;"></div>

              <div style="position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <span data-testid="tarjeta-descripcion" style="font-size: 13px; font-weight: 700;">{{ tarjeta.descripcion }}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 30px; height: 21px; border-radius: 5px; background: linear-gradient(135deg,#E8C97E,#B8893A);" aria-hidden="true"></div>
                  <button
                    data-testid="delete-button"
                    :aria-label="`Eliminar tarjeta ${tarjeta.descripcion}`"
                    style="border: none; background: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;"
                    @click="handleDelete(tarjeta.id)"
                  >
                    <Trash2 :size="15" style="color: rgba(241,236,225,.7);" />
                  </button>
                </div>
              </div>

              <div style="position: relative; display: flex; align-items: flex-end; justify-content: space-between;">
                <span style="font-size: 15px; letter-spacing: .14em; color: rgba(241,236,225,.75);">•••• ——</span>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 9px; color: rgba(241,236,225,.55); font-weight: 600; letter-spacing: .05em;">A PAGAR</p>
                  <p style="margin: 2px 0 0; font-size: 20px; font-weight: 600;">{{ fmtTarjeta(tarjeta) }}</p>
                </div>
              </div>
            </div>

            <div style="background: #fff; border: 1px solid #E7E0D2; border-top: none; border-radius: 0 0 20px 20px; padding: 15px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 11px; color: #9A9384; font-weight: 600;">Utilización</span>
                <span :style="{ fontWeight: 600, fontSize: '12px', color: utilColor(tarjeta) }">{{ utilPct(tarjeta) }}%</span>
              </div>
              <div style="height: 7px; border-radius: 999px; background: #F0EBE0; overflow: hidden; margin-bottom: 13px;">
                <div :style="{ height: '100%', width: utilWidth(tarjeta), background: utilColor(tarjeta), borderRadius: '999px' }"></div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="background: #F7F3EB; border-radius: 11px; padding: 9px 11px;">
                  <p style="font-size: 10px; color: #9A9384; font-weight: 600; margin: 0;">Deuda total</p>
                  <p data-testid="tarjeta-deuda" style="margin: 3px 0 0; font-size: 14px; font-weight: 600; color: #1C1A15;">{{ fmtTarjeta(tarjeta) }}</p>
                </div>
                <div style="background: #F7F3EB; border-radius: 11px; padding: 9px 11px;">
                  <p style="font-size: 10px; color: #9A9384; font-weight: 600; margin: 0;">Pago mínimo</p>
                  <p data-testid="tarjeta-pago-minimo" style="margin: 3px 0 0; font-size: 14px; font-weight: 600; color: #1C1A15;">{{ tarjeta.pagoMinimo != null ? fmtSoles(tarjeta.pagoMinimo) : '—' }}</p>
                </div>
                <div style="background: #F7F3EB; border-radius: 11px; padding: 9px 11px;">
                  <p style="font-size: 10px; color: #9A9384; font-weight: 600; margin: 0;">Línea</p>
                  <p data-testid="tarjeta-linea" style="margin: 3px 0 0; font-size: 14px; font-weight: 600; color: #1C1A15;">{{ fmtLinea(tarjeta) }}</p>
                </div>
                <div style="background: #F7F3EB; border-radius: 11px; padding: 9px 11px;">
                  <p style="font-size: 10px; color: #9A9384; font-weight: 600; margin: 0;">Saldo total</p>
                  <p data-testid="tarjeta-saldo-total" style="margin: 3px 0 0; font-size: 14px; font-weight: 600; color: #1C1A15;">{{ tarjeta.saldoTotal != null ? fmtSoles(tarjeta.saldoTotal) : '—' }}</p>
                </div>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button
                  data-testid="edit-button"
                  style="flex: 1; border: 1px solid #E7E0D2; background: #fff; border-radius: 10px; padding: 8px; font-size: 11px; font-weight: 700; color: #9A9384; cursor: pointer;"
                  @click="startEdit(tarjeta)"
                >
                  Editar
                </button>
                <button
                  data-testid="pay-button"
                  style="flex: 1; border: none; background: linear-gradient(135deg,#D06A8E,#A8315B); border-radius: 10px; padding: 8px; font-size: 11px; font-weight: 700; color: #fff; cursor: pointer;"
                  @click="startPay(tarjeta)"
                >
                  Pagar
                </button>
              </div>

              <div v-if="payingId === tarjeta.id" data-testid="pay-form" style="margin-top: 12px; background: #FBE6EC; border-radius: 12px; padding: 12px;">
                <p style="font-size: 11px; font-weight: 700; color: #A8315B; margin: 0 0 8px;">Registrar pago</p>
                <div style="display: flex; gap: 8px;">
                  <input
                    data-testid="pay-amount-input"
                    type="text"
                    inputmode="decimal"
                    :value="payAmount"
                    placeholder="Monto"
                    style="flex: 1; border: 1px solid #F5D2DC; border-radius: 10px; padding: 8px 12px; font-size: 13px; outline: none; background: #fff;"
                    @input="payAmount = ($event.target as HTMLInputElement).value"
                  />
                  <button
                    data-testid="confirm-pay-button"
                    style="border: none; background: #A8315B; color: #fff; border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer;"
                    @click="confirmPay(tarjeta.id)"
                  >
                    OK
                  </button>
                  <button
                    data-testid="cancel-pay-button"
                    style="border: 1px solid #F5D2DC; background: #fff; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer;"
                    @click="cancelPay"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div v-if="pagosDeTarjeta(tarjeta.id).length > 0" data-testid="pagos-historial" style="margin-top: 12px;">
                <button
                  data-testid="toggle-historial"
                  style="font-size: 11px; font-weight: 700; color: #9A9384; background: none; border: none; cursor: pointer; padding: 0;"
                  @click="toggleHistorial(tarjeta.id)"
                >
                  Historial de pagos ({{ pagosDeTarjeta(tarjeta.id).length }})
                </button>
                <div v-if="openHistorial[tarjeta.id]" data-testid="historial-list" style="margin-top: 8px;">
                  <div
                    v-for="pago in pagosDeTarjeta(tarjeta.id)"
                    :key="pago.id"
                    data-testid="pago-item"
                    style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F0EBE0;"
                  >
                    <span style="font-size: 12px; color: #1C1A15;">{{ fmtSoles(pago.monto) }}</span>
                    <button
                      data-testid="remove-pago-button"
                      :aria-label="`Eliminar pago de ${fmtSoles(pago.monto)}`"
                      style="border: none; background: none; cursor: pointer; font-size: 11px; color: #C65A3A;"
                      @click="handleRemovePago(pago.id)"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
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

        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Línea de crédito</p>
          <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="tablist" data-testid="linea-currency-tabs">
            <button
              v-for="opt in ([
                { key: 'pen', label: 'Soles' },
                { key: 'usd', label: 'Dólares' },
                { key: 'both', label: 'Ambas' },
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
