<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Clock, Trash2, Inbox, ChevronDown, ChevronUp, GripVertical, Pencil } from 'lucide-vue-next'
import { useDeudas } from '../composables/useDeudas'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { useAuthStore } from '~/stores/auth'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import type { Deuda } from '~/shared/types'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput, onIntInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, validateTasaInteres, sanitize } from '~/shared/utils/validation'

defineProps<{ embedded?: boolean }>()

const {
  deudas,
  isLoading,
  isError,
  totalDeudas,
  totalPendiente,
  addDeuda,
  updateDeuda,
  removeDeuda,
  isAdding,
  isUpdating,
} = useDeudas()

const { startLoading, finishLoading, showToast } = useAppFeedback()
const auth = useAuthStore()
const userId = computed(() => auth.userId)

const form = reactive({
  nombrePersona: '',
  totalDeuda: '',
  tasaInteres: '',
  cuotasPagadas: '',
  totalCuotas: '',
  cuotaMensual: '',
  montoActualPendiente: '',
  descripcion: '',
})
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

function openModal(): void {
  formError.value = null
  isModalOpen.value = true
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Deuda agregada correctamente')
    isModalOpen.value = false
  }
})

function handleSubmit(): void {
  formError.value = null
  const totalDeudaNum = parseMoneyInput(form.totalDeuda)
  const tasaInteresNum = parseMoneyInput(form.tasaInteres)
  const montoActualNum = parseMoneyInput(form.montoActualPendiente)
  const cuotaMensualNum = form.cuotaMensual ? parseMoneyInput(form.cuotaMensual) : undefined
  const cuotasPagadasNum = form.cuotasPagadas ? parseInt(form.cuotasPagadas, 10) : 0
  const totalCuotasRaw = parseInt(String(form.totalCuotas), 10)
  const totalCuotasNum = !isNaN(totalCuotasRaw) && totalCuotasRaw > 0 ? totalCuotasRaw : undefined

  const nombrePersona = sanitize(form.nombrePersona)
  const descripcion = sanitize(form.descripcion)

  const nombreResult = validateDescripcion(nombrePersona, 'El nombre de la persona', 'El nombre de la persona es requerido')
  if (!nombreResult.valid) { formError.value = nombreResult.error!; return }

  const descResult = validateDescripcion(descripcion)
  if (!descResult.valid) { formError.value = descResult.error!; return }

  const totalResult = validateMonto(totalDeudaNum, 'El total de la deuda')
  if (!totalResult.valid) { formError.value = totalResult.error!; return }

  const tasaResult = validateTasaInteres(tasaInteresNum)
  if (!tasaResult.valid) { formError.value = tasaResult.error!; return }

  const pendienteResult = validateMonto(montoActualNum, 'El monto pendiente')
  if (!pendienteResult.valid) { formError.value = pendienteResult.error!; return }

  startLoading('#D4A017')
  addDeuda({
    nombrePersona,
    totalDeuda: totalDeudaNum,
    tasaInteres: tasaInteresNum,
    cuotasPagadas: cuotasPagadasNum,
    totalCuotas: totalCuotasNum,
    cuotaMensual: cuotaMensualNum,
    montoActualPendiente: montoActualNum,
    descripcion,
  })

  Object.assign(form, {
    nombrePersona: '',
    totalDeuda: '',
    tasaInteres: '',
    cuotasPagadas: '',
    totalCuotas: '',
    cuotaMensual: '',
    montoActualPendiente: '',
    descripcion: '',
  })
}

const isEditModalOpen = ref(false)
const editingDeudaId = ref<string | null>(null)
const editForm = reactive({
  nombrePersona: '',
  totalDeuda: '',
  tasaInteres: '',
  cuotasPagadas: '',
  totalCuotas: '',
  cuotaMensual: '',
  montoActualPendiente: '',
  descripcion: '',
})
const editFormError = ref<string | null>(null)

function openEditModal(deuda: Deuda): void {
  editingDeudaId.value = deuda.id
  editFormError.value = null
  editForm.nombrePersona = deuda.nombrePersona
  editForm.totalDeuda = formatMoneyDisplay(deuda.totalDeuda)
  editForm.tasaInteres = String(deuda.tasaInteres)
  editForm.cuotasPagadas = String(deuda.cuotasPagadas)
  editForm.totalCuotas = deuda.totalCuotas ? String(deuda.totalCuotas) : ''
  editForm.cuotaMensual = deuda.cuotaMensual ? formatMoneyDisplay(deuda.cuotaMensual) : ''
  editForm.montoActualPendiente = formatMoneyDisplay(deuda.montoActualPendiente)
  editForm.descripcion = deuda.descripcion
  isEditModalOpen.value = true
}

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    showToast('Deuda actualizada correctamente')
    isEditModalOpen.value = false
    editingDeudaId.value = null
  }
})

function handleEditSubmit(): void {
  if (!editingDeudaId.value) return
  editFormError.value = null
  const totalDeudaNum = parseMoneyInput(editForm.totalDeuda)
  const tasaInteresNum = parseMoneyInput(editForm.tasaInteres)
  const montoActualNum = parseMoneyInput(editForm.montoActualPendiente)
  const cuotaMensualNum = editForm.cuotaMensual ? parseMoneyInput(editForm.cuotaMensual) : undefined
  const cuotasPagadasNum = editForm.cuotasPagadas ? parseInt(editForm.cuotasPagadas, 10) : 0
  const totalCuotasRaw = parseInt(String(editForm.totalCuotas), 10)
  const totalCuotasNum = !isNaN(totalCuotasRaw) && totalCuotasRaw > 0 ? totalCuotasRaw : undefined

  const nombrePersona = sanitize(editForm.nombrePersona)
  const descripcion = sanitize(editForm.descripcion)

  const nombreResult = validateDescripcion(nombrePersona, 'El nombre de la persona', 'El nombre de la persona es requerido')
  if (!nombreResult.valid) { editFormError.value = nombreResult.error!; return }

  const descResult = validateDescripcion(descripcion)
  if (!descResult.valid) { editFormError.value = descResult.error!; return }

  const totalResult = validateMonto(totalDeudaNum, 'El total de la deuda')
  if (!totalResult.valid) { editFormError.value = totalResult.error!; return }

  const tasaResult = validateTasaInteres(tasaInteresNum)
  if (!tasaResult.valid) { editFormError.value = tasaResult.error!; return }

  const pendienteResult = validateMonto(montoActualNum, 'El monto pendiente')
  if (!pendienteResult.valid) { editFormError.value = pendienteResult.error!; return }

  updateDeuda(editingDeudaId.value, {
    nombrePersona,
    totalDeuda: totalDeudaNum,
    tasaInteres: tasaInteresNum,
    cuotasPagadas: cuotasPagadasNum,
    totalCuotas: totalCuotasNum,
    cuotaMensual: cuotaMensualNum,
    montoActualPendiente: montoActualNum,
    descripcion,
  })
}

const orderKey = computed(() => `finance_${userId.value}_deudas_order`)
const deudasOrder = ref<string[]>([])

watch(
  userId,
  (id) => {
    if (!id) return
    const raw = localStorage.getItem(`finance_${id}_deudas_order`)
    deudasOrder.value = raw ? (JSON.parse(raw) as string[]) : []
  },
  { immediate: true },
)

watch(
  () => deudas.value.map((d) => d.id),
  (ids) => {
    const missing = ids.filter((id) => !deudasOrder.value.includes(id))
    if (missing.length) deudasOrder.value = [...deudasOrder.value, ...missing]
    deudasOrder.value = deudasOrder.value.filter((id) => ids.includes(id))
  },
)

const sortedDeudas = computed(() => {
  if (deudasOrder.value.length === 0) return deudas.value
  return [...deudas.value].sort((a, b) => {
    const ai = deudasOrder.value.indexOf(a.id)
    const bi = deudasOrder.value.indexOf(b.id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
})

const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(event: DragEvent, id: string) {
  draggingId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function onDragOver(event: DragEvent, id: string) {
  event.preventDefault()
  if (draggingId.value && draggingId.value !== id) {
    dragOverId.value = id
  }
}

function onDrop(event: DragEvent, targetId: string) {
  event.preventDefault()
  if (!draggingId.value || draggingId.value === targetId) return

  const order = [...deudasOrder.value]
  const fromIdx = order.indexOf(draggingId.value)
  const toIdx = order.indexOf(targetId)

  if (fromIdx !== -1 && toIdx !== -1) {
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, draggingId.value)
    deudasOrder.value = order
    localStorage.setItem(orderKey.value, JSON.stringify(order))
  }

  draggingId.value = null
  dragOverId.value = null
}

function onDragEnd() {
  draggingId.value = null
  dragOverId.value = null
}

const pendingDeleteId = ref<string | null>(null)

function handleDelete(id: string): void {
  pendingDeleteId.value = id
}

function confirmDelete(): void {
  if (pendingDeleteId.value) removeDeuda(pendingDeleteId.value)
  pendingDeleteId.value = null
}

defineExpose({ openModal })

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function porcentajePagado(deuda: { totalDeuda: number; montoActualPendiente: number }): number {
  if (deuda.totalDeuda === 0) return 0
  return Math.round(((deuda.totalDeuda - deuda.montoActualPendiente) / deuda.totalDeuda) * 100)
}

const expandedDeudaId = ref<string | null>(null)

function toggleAmortizacion(id: string): void {
  expandedDeudaId.value = expandedDeudaId.value === id ? null : id
}

interface CuotaRow {
  numero: number
  fecha: string
  pago: number
  saldo: number
  cancelado: boolean
}

function pagarCuota(deuda: Deuda, numeroCuota: number): void {
  const pagoMensual = deuda.cuotaMensual ?? deuda.montoActualPendiente
  const nuevasCuotasPagadas = numeroCuota
  const nuevoPendiente = Math.max(0, deuda.totalDeuda - nuevasCuotasPagadas * pagoMensual)
  updateDeuda(deuda.id, {
    cuotasPagadas: nuevasCuotasPagadas,
    montoActualPendiente: nuevoPendiente,
  })
}

function despagarCuota(deuda: Deuda, numeroCuota: number): void {
  const pagoMensual = deuda.cuotaMensual ?? deuda.montoActualPendiente
  const nuevasCuotasPagadas = numeroCuota - 1
  const nuevoPendiente = Math.max(0, deuda.totalDeuda - nuevasCuotasPagadas * pagoMensual)
  updateDeuda(deuda.id, {
    cuotasPagadas: nuevasCuotasPagadas,
    montoActualPendiente: nuevoPendiente,
  })
}

function calcularAmortizacion(deuda: Deuda): CuotaRow[] {
  const { totalDeuda, cuotaMensual, montoActualPendiente, totalCuotas, cuotasPagadas } = deuda
  const pagoMensual = cuotaMensual ?? montoActualPendiente
  if (!totalCuotas || totalCuotas <= 0 || pagoMensual <= 0) return []

  const rows: CuotaRow[] = []
  let saldo = totalDeuda

  const today = new Date()
  const start = new Date(today)
  start.setMonth(start.getMonth() - cuotasPagadas)

  for (let i = 1; i <= totalCuotas; i++) {
    const fecha = new Date(start)
    fecha.setMonth(fecha.getMonth() + i)
    saldo = i === totalCuotas ? 0 : Math.max(0, saldo - pagoMensual)

    rows.push({
      numero: i,
      fecha: fecha.toLocaleDateString('es-PE', { year: 'numeric', month: 'short' }),
      pago: pagoMensual,
      saldo,
      cancelado: i <= cuotasPagadas,
    })
  }

  return rows
}
</script>

<template>
  <div :class="embedded ? '' : 'min-h-screen bg-[#F0F2F5]'" data-testid="deudas-view">
    <div :class="embedded ? 'space-y-4' : 'max-w-5xl mx-auto p-5 lg:p-8 space-y-5'">
      <PageHeader
        v-if="!embedded"
        title="Deudas"
        subtitle="Gestiona tus deudas personales"
        button-label="Agregar deuda"
        button-color="#D4A017"
        button-testid="open-modal-button"
        @action="openModal"
      />

      <div
        v-if="!embedded"
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #d4a017 0%, #a87a0f 100%)"
      >
        <div class="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-[0.08]" style="background: white"></div>
        <div class="absolute -bottom-14 -left-6 w-52 h-52 rounded-full opacity-[0.05]" style="background: white"></div>

        <div class="relative z-10">
          <div class="flex items-start justify-between gap-4 mb-5">
            <p class="text-white/60 text-xs font-semibold uppercase tracking-widest">Deudas</p>
            <div class="shrink-0 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Clock :size="24" class="text-white" aria-hidden="true" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white/15 rounded-2xl p-4" data-testid="total-deudas-card">
              <p class="text-white/50 text-xs mb-1">Total bruto</p>
              <p class="text-2xl lg:text-3xl font-black text-white tracking-tight" data-testid="total-deudas">
                {{ formatCurrency(totalDeudas) }}
              </p>
            </div>
            <div class="bg-white/15 rounded-2xl p-4" data-testid="total-pendiente-card">
              <p class="text-white/50 text-xs mb-1">Pendiente</p>
              <p class="text-2xl lg:text-3xl font-black text-white tracking-tight" data-testid="total-pendiente">
                {{ formatCurrency(totalPendiente) }}
              </p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-white/50 text-xs">
              {{ deudas.length }} deuda{{ deudas.length !== 1 ? 's' : '' }} activa{{ deudas.length !== 1 ? 's' : '' }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="isLoading" class="text-center py-16 text-[#94A3B8]" data-testid="loading-state">Cargando...</div>

        <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #c65a3a" data-testid="error-state">
          Error al cargar las deudas
        </div>

        <EmptyState
          v-else-if="deudas.length === 0"
          :icon="Inbox"
          color="#D4A017"
          title="No hay préstamos registrados"
          subtitle="Hacé seguimiento de tus deudas y cuotas mensuales"
          action-label="Agregar préstamo"
          testid="empty-state"
          @action="openModal"
        />

        <div v-else class="space-y-4" data-testid="deudas-list">
          <div
            v-for="deuda in sortedDeudas"
            :key="deuda.id"
            class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm transition-all duration-200"
            :class="{
              'opacity-40 scale-[0.98]': draggingId === deuda.id,
              'ring-2 ring-[#D4A017]/40 scale-[1.005]': dragOverId === deuda.id && draggingId !== deuda.id,
            }"
            draggable="true"
            data-testid="deuda-item"
            @dragstart="onDragStart($event, deuda.id)"
            @dragover="onDragOver($event, deuda.id)"
            @drop="onDrop($event, deuda.id)"
            @dragend="onDragEnd"
          >
            <div class="flex items-start gap-3 p-5 pb-4">
              <div
                class="flex items-center pt-0.5 text-[#CBD5E1] hover:text-[#94A3B8] cursor-grab active:cursor-grabbing transition-colors shrink-0"
                aria-hidden="true"
              >
                <GripVertical :size="16" />
              </div>

              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                style="background: rgba(212, 160, 23, 0.1); color: #d4a017"
                aria-hidden="true"
              >
                {{ deuda.nombrePersona.charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-[#1A1A2E]" data-testid="deuda-persona">{{ deuda.nombrePersona }}</p>
                <p class="text-xs text-[#64748B]" data-testid="deuda-descripcion">{{ deuda.descripcion }}</p>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#D4A017] hover:bg-[#D4A017]/8 transition-colors"
                  :aria-label="`Editar deuda de ${deuda.nombrePersona}`"
                  data-testid="edit-deuda-button"
                  @click="openEditModal(deuda)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-colors"
                  :aria-label="`Eliminar deuda de ${deuda.nombrePersona}`"
                  data-testid="delete-button"
                  @click="handleDelete(deuda.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div class="px-5 pb-5 space-y-4">
              <div>
                <div class="flex justify-between text-xs text-[#94A3B8] mb-1.5">
                  <span>Progreso de pago</span>
                  <span class="font-semibold" style="color: #d4a017">{{ porcentajePagado(deuda) }}%</span>
                </div>
                <div class="h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{ width: `${porcentajePagado(deuda)}%`, backgroundColor: '#D4A017' }"
                  ></div>
                </div>
              </div>

              <div class="grid grid-cols-4 gap-2 text-center">
                <div class="bg-[#F0F2F5] rounded-xl p-2.5">
                  <p class="text-xs text-[#94A3B8] mb-0.5">Total</p>
                  <p class="text-xs font-bold text-[#1A1A2E]" data-testid="deuda-total">
                    {{ formatCurrency(deuda.totalDeuda) }}
                  </p>
                </div>
                <div class="rounded-xl p-2.5" style="background: rgba(198, 90, 58, 0.08)">
                  <p class="text-xs mb-0.5" style="color: #c65a3a">Pendiente</p>
                  <p class="text-xs font-bold" style="color: #c65a3a" data-testid="deuda-pendiente">
                    {{ formatCurrency(deuda.montoActualPendiente) }}
                  </p>
                </div>
                <div class="bg-[#F0F2F5] rounded-xl p-2.5">
                  <p class="text-xs text-[#94A3B8] mb-0.5">Cuota</p>
                  <p class="text-xs font-bold text-[#1A1A2E]">
                    {{ deuda.cuotaMensual ? formatCurrency(deuda.cuotaMensual) : '—' }}
                  </p>
                </div>
                <div class="bg-[#F0F2F5] rounded-xl p-2.5">
                  <p class="text-xs text-[#94A3B8] mb-0.5">Cuotas</p>
                  <p class="text-xs font-bold text-[#1A1A2E]">
                    {{ deuda.cuotasPagadas }}{{ deuda.totalCuotas ? ` / ${deuda.totalCuotas}` : '' }}
                  </p>
                </div>
              </div>

              <template v-if="deuda.totalCuotas">
                <div class="rounded-xl border border-[#EEEEF0] overflow-hidden">
                  <button
                    class="w-full flex items-center justify-between px-4 py-3 transition-colors"
                    :class="
                      expandedDeudaId === deuda.id
                        ? 'bg-[#D4A017]/10 text-[#A87A0F]'
                        : 'bg-[#F5F6FA] text-[#64748B] hover:bg-[#EEEEF0]'
                    "
                    data-testid="toggle-amortizacion-button"
                    @click="toggleAmortizacion(deuda.id)"
                  >
                    <div class="flex items-center gap-2">
                      <Clock
                        :size="14"
                        :style="{ color: expandedDeudaId === deuda.id ? '#D4A017' : '#94A3B8' }"
                        aria-hidden="true"
                      />
                      <span class="text-xs font-semibold">Plan de pagos ({{ deuda.totalCuotas }} cuotas)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span
                        class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        :class="
                          expandedDeudaId === deuda.id
                            ? 'bg-[#D4A017]/20 text-[#A87A0F]'
                            : 'bg-[#EEEEF0] text-[#94A3B8]'
                        "
                      >
                        {{ deuda.cuotasPagadas }} pagadas
                      </span>
                      <component
                        :is="expandedDeudaId === deuda.id ? ChevronUp : ChevronDown"
                        :size="14"
                        :style="{ color: expandedDeudaId === deuda.id ? '#D4A017' : '#94A3B8' }"
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  <div v-if="expandedDeudaId === deuda.id" data-testid="amortizacion-table">
                    <div class="max-h-72 overflow-y-auto">
                      <table class="w-full text-xs min-w-105">
                        <thead class="sticky top-0 bg-white border-b border-[#EEEEF0]">
                          <tr>
                            <th class="py-2 px-3 text-left font-semibold text-[#64748B] w-10">N°</th>
                            <th class="py-2 px-3 text-left font-semibold text-[#64748B]">Fecha</th>
                            <th class="py-2 px-3 text-right font-semibold text-[#64748B]">Pago</th>
                            <th class="py-2 px-3 text-right font-semibold text-[#64748B]">Saldo</th>
                            <th class="py-2 px-3 text-center font-semibold text-[#64748B]">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="cuota in calcularAmortizacion(deuda)"
                            :key="cuota.numero"
                            class="border-b border-[#EEEEF0] last:border-0"
                            :class="cuota.cancelado ? 'bg-emerald-50/40' : ''"
                            data-testid="amortizacion-row"
                          >
                            <td class="py-2 px-3 text-[#94A3B8]">{{ cuota.numero }}</td>
                            <td class="py-2 px-3 text-[#64748B]">{{ cuota.fecha }}</td>
                            <td class="py-2 px-3 text-right font-medium text-[#1A1A2E]">
                              {{ formatCurrency(cuota.pago) }}
                            </td>
                            <td class="py-2 px-3 text-right text-[#64748B]">{{ formatCurrency(cuota.saldo) }}</td>
                            <td class="py-2 px-3 text-center">
                              <button
                                type="button"
                                class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-opacity hover:opacity-70 active:scale-95"
                                :class="
                                  cuota.cancelado ? 'bg-emerald-50 text-emerald-600' : 'bg-[#D4A017]/10 text-[#D4A017]'
                                "
                                :title="
                                  cuota.cancelado
                                    ? 'Haz clic para desmarcar como pagado'
                                    : 'Haz clic para marcar como pagado'
                                "
                                @click="
                                  cuota.cancelado ? despagarCuota(deuda, cuota.numero) : pagarCuota(deuda, cuota.numero)
                                "
                              >
                                {{ cuota.cancelado ? '✓ Cancelado' : 'Pendiente' }}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppModal
    :open="isModalOpen"
    title="Nuevo préstamo"
    subtitle="Registrá una deuda o crédito personal"
    accent-color="#D4A017"
    @close="isModalOpen = false"
  >
    <form data-testid="deudas-form" novalidate autocomplete="off" @submit.prevent="handleSubmit">
      <div class="space-y-5">
        <!-- Sección: Datos -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Datos</p>
          <div>
            <label for="nombre-persona" class="block text-xs font-medium text-slate-600 mb-1.5">Nombre de la persona / entidad</label>
            <input
              id="nombre-persona"
              v-model="form.nombrePersona"
              type="text"
              autocomplete="off"
              placeholder="Ej: Juan Pérez"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
              data-testid="nombre-persona-input"
            />
          </div>
          <div>
            <label for="descripcion-deuda" class="block text-xs font-medium text-slate-600 mb-1.5">Descripción</label>
            <input
              id="descripcion-deuda"
              v-model="form.descripcion"
              type="text"
              autocomplete="off"
              placeholder="Ej: Préstamo personal"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
              data-testid="descripcion-input"
            />
          </div>
        </div>

        <!-- Sección: Montos -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Montos</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="total-deuda" class="block text-xs font-medium text-slate-600 mb-1.5">Total</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                <input
                  id="total-deuda"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.totalDeuda"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                  data-testid="total-deuda-input"
                  @input="onDecimalInput($event, (v) => (form.totalDeuda = v))"
                  @blur="form.totalDeuda = formatMoneyDisplay(form.totalDeuda)"
                />
              </div>
            </div>
            <div>
              <label for="monto-pendiente" class="block text-xs font-medium text-slate-600 mb-1.5">Pendiente</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                <input
                  id="monto-pendiente"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.montoActualPendiente"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                  data-testid="monto-pendiente-input"
                  @input="onDecimalInput($event, (v) => (form.montoActualPendiente = v))"
                  @blur="form.montoActualPendiente = formatMoneyDisplay(form.montoActualPendiente)"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="cuota-mensual" class="block text-xs font-medium text-slate-600 mb-1.5">Cuota mensual</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">S/</span>
                <input
                  id="cuota-mensual"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.cuotaMensual"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                  data-testid="cuota-mensual-input"
                  @input="onDecimalInput($event, (v) => (form.cuotaMensual = v))"
                  @blur="form.cuotaMensual = formatMoneyDisplay(form.cuotaMensual)"
                />
              </div>
            </div>
            <div>
              <label for="tasa-interes" class="block text-xs font-medium text-slate-600 mb-1.5">Interés anual</label>
              <div class="relative">
                <input
                  id="tasa-interes"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :value="form.tasaInteres"
                  placeholder="0.00"
                  class="w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                  data-testid="tasa-interes-input"
                  @input="onDecimalInput($event, (v) => (form.tasaInteres = v))"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección: Cuotas -->
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cuotas</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="cuotas-pagadas" class="block text-xs font-medium text-slate-600 mb-1.5">Pagadas</label>
              <input
                id="cuotas-pagadas"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                :value="form.cuotasPagadas"
                placeholder="0"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                data-testid="cuotas-pagadas-input"
                @input="onIntInput($event, (v) => (form.cuotasPagadas = v))"
              />
            </div>
            <div>
              <label for="total-cuotas" class="block text-xs font-medium text-slate-600 mb-1.5">
                Totales <span class="text-slate-400">· opc.</span>
              </label>
              <input
                id="total-cuotas"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                :value="form.totalCuotas"
                placeholder="Ej: 60"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 tabular-nums transition-all"
                data-testid="total-cuotas-input"
                @input="onIntInput($event, (v) => (form.totalCuotas = v))"
              />
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
          @click="isModalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isAdding"
          class="flex-[2] py-2.5 text-sm text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #D4A017 0%, #A87A0F 100%);"
          data-testid="submit-button"
          @click="handleSubmit"
        >
          {{ isAdding ? 'Agregando…' : 'Agregar préstamo' }}
        </button>
      </div>
    </template>
  </AppModal>

  <AppModal :open="isEditModalOpen" title="Editar Deuda" accent-color="#D4A017" @close="isEditModalOpen = false">
    <form data-testid="edit-deuda-form" novalidate @submit.prevent="handleEditSubmit">
      <div class="space-y-3">
        <div>
          <label
            for="edit-nombre-persona"
            class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
          >
            Nombre persona
          </label>
          <input
            id="edit-nombre-persona"
            v-model="editForm.nombrePersona"
            type="text"
            placeholder="Ej: Juan Pérez"
            class="w-full px-4 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
          />
        </div>

        <div>
          <label
            for="edit-descripcion"
            class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
          >
            Descripción
          </label>
          <input
            id="edit-descripcion"
            v-model="editForm.descripcion"
            type="text"
            placeholder="Ej: Préstamo personal"
            class="w-full px-4 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="edit-total-deuda"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Total (S/)
            </label>
            <input
              id="edit-total-deuda"
              type="text"
              inputmode="decimal"
              :value="editForm.totalDeuda"
              placeholder="0.00"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onDecimalInput($event, (v) => (editForm.totalDeuda = v))"
              @blur="editForm.totalDeuda = formatMoneyDisplay(editForm.totalDeuda)"
            />
          </div>
          <div>
            <label
              for="edit-monto-pendiente"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Pendiente (S/)
            </label>
            <input
              id="edit-monto-pendiente"
              type="text"
              inputmode="decimal"
              :value="editForm.montoActualPendiente"
              placeholder="0.00"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onDecimalInput($event, (v) => (editForm.montoActualPendiente = v))"
              @blur="editForm.montoActualPendiente = formatMoneyDisplay(editForm.montoActualPendiente)"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="edit-cuota-mensual"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Cuota mensual (S/)
            </label>
            <input
              id="edit-cuota-mensual"
              type="text"
              inputmode="decimal"
              :value="editForm.cuotaMensual"
              placeholder="0.00"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onDecimalInput($event, (v) => (editForm.cuotaMensual = v))"
              @blur="editForm.cuotaMensual = formatMoneyDisplay(editForm.cuotaMensual)"
            />
          </div>
          <div>
            <label
              for="edit-tasa-interes"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Interés (%)
            </label>
            <input
              id="edit-tasa-interes"
              type="text"
              inputmode="decimal"
              :value="editForm.tasaInteres"
              placeholder="0.00"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onDecimalInput($event, (v) => (editForm.tasaInteres = v))"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="edit-cuotas-pagadas"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Cuotas pagadas
            </label>
            <input
              id="edit-cuotas-pagadas"
              type="text"
              inputmode="numeric"
              :value="editForm.cuotasPagadas"
              placeholder="0"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onIntInput($event, (v) => (editForm.cuotasPagadas = v))"
            />
          </div>
          <div>
            <label
              for="edit-total-cuotas"
              class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
            >
              Total cuotas <span class="font-normal normal-case text-[#94A3B8]">(opcional)</span>
            </label>
            <input
              id="edit-total-cuotas"
              type="text"
              inputmode="numeric"
              :value="editForm.totalCuotas"
              placeholder="Ej: 60"
              class="w-full px-3 py-2.5 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/30 focus:border-transparent focus:bg-white transition-all"
              @input="onIntInput($event, (v) => (editForm.totalCuotas = v))"
            />
          </div>
        </div>

        <p
          v-if="editFormError"
          class="text-sm bg-[#C65A3A]/8 border border-[#C65A3A]/20 rounded-xl px-3 py-2.5"
          style="color: #c65a3a"
          role="alert"
        >
          {{ editFormError }}
        </p>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-3 text-[#64748B] font-bold rounded-xl border border-[#EEEEF0] hover:bg-[#F5F6FA] transition-all"
            @click="isEditModalOpen = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="isUpdating"
            class="flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: linear-gradient(135deg, #d4a017 0%, #a87a0f 100%)"
            data-testid="edit-submit-button"
          >
            {{ isUpdating ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </form>
  </AppModal>

  <ConfirmDialog
    :open="pendingDeleteId !== null"
    @confirm="confirmDelete"
    @cancel="pendingDeleteId = null"
  />
</template>
