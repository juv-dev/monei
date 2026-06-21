<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Clock, Trash2, ChevronDown, Pencil, Check } from 'lucide-vue-next'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import type { Deuda } from '~/shared/types'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput, onIntInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, validateTasaInteres, sanitize } from '~/shared/utils/validation'
import AppModal from '~/shared/components/ui/AppModal.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'

const {
  deudas,
  isLoading,
  isError,
  totalPendiente,
  addDeuda,
  removeDeuda,
  updateDeuda,
  isAdding,
  isUpdating,
} = useDeudas()

const { startLoading, finishLoading, showToast } = useAppFeedback()

function fmtSoles(n: number): string {
  const v = Math.round(Math.abs(n))
  return 'S/ ' + v.toLocaleString('es-PE')
}

const prestCuotaMes = computed(() =>
  deudas.value.reduce((acc, d) => acc + (d.cuotaMensual ?? 0), 0),
)

const prestPagado = computed(() =>
  deudas.value.reduce((acc, d) => acc + (d.totalDeuda - d.montoActualPendiente), 0),
)

function progPct(d: Deuda): number {
  if (d.totalDeuda === 0) return 0
  return Math.round(((d.totalDeuda - d.montoActualPendiente) / d.totalDeuda) * 100)
}

const openPlan = ref<Record<string, boolean>>({})

function togglePlan(id: string): void {
  openPlan.value[id] = !openPlan.value[id]
}

interface CuotaRow {
  numero: number
  fecha: string
  pago: number
  saldo: number
  cancelado: boolean
  esCuotaActual: boolean
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
      esCuotaActual: i === cuotasPagadas + 1,
    })
  }

  return rows
}

function pagarCuota(deuda: Deuda, numeroCuota: number): void {
  const pagoMensual = deuda.cuotaMensual ?? deuda.montoActualPendiente
  updateDeuda(deuda.id, {
    cuotasPagadas: numeroCuota,
    montoActualPendiente: Math.max(0, deuda.totalDeuda - numeroCuota * pagoMensual),
  })
}

function despagarCuota(deuda: Deuda, numeroCuota: number): void {
  const pagoMensual = deuda.cuotaMensual ?? deuda.montoActualPendiente
  const nuevasCuotasPagadas = numeroCuota - 1
  updateDeuda(deuda.id, {
    cuotasPagadas: nuevasCuotasPagadas,
    montoActualPendiente: Math.max(0, deuda.totalDeuda - nuevasCuotasPagadas * pagoMensual),
  })
}

const pendingDeleteId = ref<string | null>(null)

function handleDelete(id: string): void {
  pendingDeleteId.value = id
}

function confirmDelete(): void {
  if (pendingDeleteId.value) removeDeuda(pendingDeleteId.value)
  pendingDeleteId.value = null
}

const isModalOpen = ref(false)
const editMode = ref(false)
const editingDeudaId = ref<string | null>(null)
const formError = ref<string | null>(null)

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

const modalTitle = computed(() => (editMode.value ? 'Editar préstamo' : 'Nuevo préstamo'))
const modalSubtitle = computed(() => (editMode.value ? '' : 'Registrá una deuda o crédito personal'))
const isSubmitting = computed(() => isAdding.value || isUpdating.value)
const submitLabel = computed(() => {
  if (editMode.value) return isUpdating.value ? 'Guardando…' : 'Guardar cambios'
  return isAdding.value ? 'Agregando…' : 'Agregar préstamo'
})

function openModal(): void {
  editMode.value = false
  editingDeudaId.value = null
  formError.value = null
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
  isModalOpen.value = true
}

function openEditModal(deuda: Deuda): void {
  editMode.value = true
  editingDeudaId.value = deuda.id
  formError.value = null
  Object.assign(form, {
    nombrePersona: deuda.nombrePersona,
    totalDeuda: formatMoneyDisplay(deuda.totalDeuda),
    tasaInteres: String(deuda.tasaInteres),
    cuotasPagadas: String(deuda.cuotasPagadas),
    totalCuotas: deuda.totalCuotas ? String(deuda.totalCuotas) : '',
    cuotaMensual: deuda.cuotaMensual ? formatMoneyDisplay(deuda.cuotaMensual) : '',
    montoActualPendiente: formatMoneyDisplay(deuda.montoActualPendiente),
    descripcion: deuda.descripcion,
  })
  isModalOpen.value = true
}

function closeModal(): void {
  isModalOpen.value = false
  formError.value = null
}

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

  const payload = {
    nombrePersona,
    totalDeuda: totalDeudaNum,
    tasaInteres: tasaInteresNum,
    cuotasPagadas: cuotasPagadasNum,
    totalCuotas: totalCuotasNum,
    cuotaMensual: cuotaMensualNum,
    montoActualPendiente: montoActualNum,
    descripcion,
  }

  if (editMode.value && editingDeudaId.value) {
    updateDeuda(editingDeudaId.value, payload)
  } else {
    startLoading('#D4A017')
    addDeuda(payload)
  }
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Préstamo agregado correctamente')
    closeModal()
  }
})

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    showToast('Préstamo actualizado')
    closeModal()
  }
})

defineExpose({ openModal })
</script>

<template>
  <div class="min-h-full bg-[#F8F6F1]" data-testid="creditos-view">
    <div style="padding: 62px 18px 110px;">

      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 15px;">
        <div>
          <p style="margin: 0; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: #1C1A15;">Créditos</p>
          <p style="margin: 3px 0 0; font-size: 12px; color: #9A9384; font-weight: 500;">Tus préstamos y planes de pago</p>
        </div>
        <button
          data-testid="open-modal-button"
          style="background: linear-gradient(135deg, #C8AA72, #8A6840); color: #fff; border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 700; box-shadow: 0 6px 14px -4px rgba(138,104,64,.4); border: none; cursor: pointer; white-space: nowrap;"
          @click="openModal"
        >
          + Agregar
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-16" style="color: #9A9384;" data-testid="loading-state">Cargando...</div>

      <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #C25A4E;" data-testid="error-state">Error al cargar los préstamos</div>

      <template v-else>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 14px;" data-testid="creditos-summary">
          <div style="border-radius: 16px; padding: 13px; background: linear-gradient(135deg, #F6EEDD, #EFE0BF); border: 1px solid rgba(184,137,58,.22);">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 7px;">
              <div style="width: 24px; height: 24px; border-radius: 7px; background: rgba(184,137,58,.16); display: flex; align-items: center; justify-content: center;">
                <Clock :size="13" style="color: #B8893A;" aria-hidden="true" />
              </div>
              <p style="font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #9A6F2A; text-transform: uppercase; margin: 0;">Pendiente</p>
            </div>
            <p style="font-size: 19px; font-weight: 600; letter-spacing: -0.02em; margin: 0; color: #1C1A15;" data-testid="total-credito">{{ fmtSoles(totalPendiente) }}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #9A6F2A; font-weight: 600;">{{ deudas.length }} préstamos activos</p>
          </div>

          <div style="background: #fff; border: 1px solid #E7E0D2; border-radius: 16px; padding: 13px;">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 7px;">
              <div style="width: 24px; height: 24px; border-radius: 7px; background: #FBE9E6; display: flex; align-items: center; justify-content: center;">
                <Clock :size="13" style="color: #C25A4E;" aria-hidden="true" />
              </div>
              <p style="font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #9A9384; text-transform: uppercase; margin: 0;">Cuota / mes</p>
            </div>
            <p style="font-size: 19px; font-weight: 600; margin: 0; color: #1C1A15;">{{ fmtSoles(prestCuotaMes) }}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #9A9384; font-weight: 600;">Pagado {{ fmtSoles(prestPagado) }}</p>
          </div>
        </div>

        <div v-if="deudas.length === 0" style="background: #fff; border: 1px solid #E7E0D2; border-radius: 22px; padding: 40px 24px; text-align: center; box-shadow: 0 1px 3px rgba(28,26,21,.05);" data-testid="empty-state">
          <div style="width: 54px; height: 54px; border-radius: 16px; background: #F6EEDD; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
            <Clock :size="26" style="color: #B8893A;" aria-hidden="true" />
          </div>
          <p style="font-size: 15px; font-weight: 800; margin: 0; color: #1C1A15;">No tenés préstamos</p>
          <p style="margin: 5px 0 16px; font-size: 12px; color: #9A9384;">Registrá un préstamo para seguir su plan de pagos</p>
          <button
            style="background: linear-gradient(135deg, #C8AA72, #8A6840); color: #fff; border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 700; box-shadow: 0 6px 14px -4px rgba(138,104,64,.4); border: none; cursor: pointer;"
            @click="openModal"
          >
            Agregar préstamo
          </button>
        </div>

        <div v-else>
          <div
            v-for="deuda in deudas"
            :key="deuda.id"
            style="background: #fff; border: 1px solid #E7E0D2; border-radius: 18px; padding: 15px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(28,26,21,.05);"
            data-testid="deuda-item"
          >
            <div style="display: flex; align-items: center; gap: 11px; margin-bottom: 13px;">
              <div
                style="width: 38px; height: 38px; border-radius: 11px; background: #F6EEDD; color: #B8893A; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0;"
                aria-hidden="true"
              >
                {{ deuda.nombrePersona.charAt(0).toUpperCase() }}
              </div>
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 15px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; color: #1C1A15;">{{ deuda.nombrePersona }}</p>
                <p style="font-size: 11px; color: #9A9384; font-weight: 600; margin: 2px 0 0;">{{ deuda.descripcion }}</p>
              </div>
              <div style="display: flex; align-items: center; gap: 2px; flex-shrink: 0;">
                <button
                  :aria-label="`Editar préstamo de ${deuda.nombrePersona}`"
                  style="border: none; background: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;"
                  data-testid="edit-button"
                  @click="openEditModal(deuda)"
                >
                  <Pencil :size="15" style="color: #C9B9A0;" />
                </button>
                <button
                  :aria-label="`Eliminar préstamo de ${deuda.nombrePersona}`"
                  style="border: none; background: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;"
                  @click="handleDelete(deuda.id)"
                >
                  <Trash2 :size="16" style="color: #C9B9A0;" />
                </button>
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; color: #9A9384; font-weight: 600;">Progreso de pago</span>
              <span style="font-size: 12px; font-weight: 600; color: #B8893A;">{{ progPct(deuda) }}%</span>
            </div>
            <div style="height: 7px; border-radius: 999px; background: #F4EFE5; overflow: hidden; margin-bottom: 13px;">
              <div :style="{ width: progPct(deuda) + '%', background: 'linear-gradient(90deg,#D4A017,#B8893A)', height: '100%', borderRadius: '999px' }"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 13px;">
              <div style="background: #F7F3EB; border-radius: 10px; padding: 8px 7px; text-align: center;">
                <p style="font-size: 9px; color: #9A9384; font-weight: 600; margin: 0;">Total</p>
                <p style="font-size: 11px; font-weight: 600; margin: 3px 0 0; color: #1C1A15;">{{ fmtSoles(deuda.totalDeuda) }}</p>
              </div>
              <div style="background: #FBE9E6; border-radius: 10px; padding: 8px 7px; text-align: center;">
                <p style="font-size: 9px; color: #C25A4E; font-weight: 600; margin: 0;">Pendiente</p>
                <p style="font-size: 11px; font-weight: 600; color: #C25A4E; margin: 3px 0 0;">{{ fmtSoles(deuda.montoActualPendiente) }}</p>
              </div>
              <div style="background: #F7F3EB; border-radius: 10px; padding: 8px 7px; text-align: center;">
                <p style="font-size: 9px; color: #9A9384; font-weight: 600; margin: 0;">Cuota</p>
                <p style="font-size: 11px; font-weight: 600; margin: 3px 0 0; color: #1C1A15;">{{ deuda.cuotaMensual ? fmtSoles(deuda.cuotaMensual) : '—' }}</p>
              </div>
              <div style="background: #F7F3EB; border-radius: 10px; padding: 8px 7px; text-align: center;">
                <p style="font-size: 9px; color: #9A9384; font-weight: 600; margin: 0;">Cuotas</p>
                <p style="font-size: 11px; font-weight: 600; margin: 3px 0 0; color: #1C1A15;">{{ deuda.cuotasPagadas }}{{ deuda.totalCuotas ? ' / ' + deuda.totalCuotas : '' }}</p>
              </div>
            </div>

            <template v-if="deuda.totalCuotas && deuda.totalCuotas > 0">
              <button
                style="display: flex; align-items: center; justify-content: space-between; width: 100%; border: 1px solid #F0E6CE; background: #FCF8EF; border-radius: 12px; padding: 10px 13px; cursor: pointer;"
                data-testid="toggle-amortizacion-button"
                @click="togglePlan(deuda.id)"
              >
                <span style="display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: #B8893A;">
                  <Clock :size="13" aria-hidden="true" /> Plan de pagos
                </span>
                <span style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 10px; font-weight: 700; background: #F0E6CE; color: #B8893A; border-radius: 999px; padding: 2px 8px;">{{ deuda.cuotasPagadas }} pagadas</span>
                  <ChevronDown
                    :size="14"
                    style="color: #B8893A; transition: transform .2s;"
                    :style="{ transform: openPlan[deuda.id] ? 'rotate(180deg)' : 'rotate(0deg)' }"
                    aria-hidden="true"
                  />
                </span>
              </button>

              <div v-show="openPlan[deuda.id]" style="margin-top: 10px; border: 1px solid #F0EBE0; border-radius: 12px; overflow: hidden;" data-testid="amortizacion-table">
                <div style="display: flex; padding: 9px 13px; background: #F7F3EB; font-size: 10px; font-weight: 700; color: #9A9384; text-transform: uppercase; letter-spacing: .03em;">
                  <span style="width: 32px;">N°</span>
                  <span style="flex: 1;">Fecha</span>
                  <span style="width: 78px; text-align: right;">Pago</span>
                  <span style="width: 88px; text-align: right;">Saldo</span>
                </div>
                <div style="max-height: 184px; overflow-y: auto;">
                  <div
                    v-for="cuota in calcularAmortizacion(deuda)"
                    :key="cuota.numero"
                    :style="{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '9px 13px',
                      borderTop: '1px solid #F6F2EA',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: cuota.cancelado ? '#EAF6F0' : 'transparent',
                      boxShadow: cuota.esCuotaActual ? 'inset 3px 0 0 #D4A017' : 'none',
                      transition: 'background .15s',
                    }"
                    role="button"
                    tabindex="0"
                    :aria-label="cuota.cancelado ? `Cuota ${cuota.numero} pagada, tocar para desmarcar` : `Cuota ${cuota.numero} pendiente, tocar para marcar como pagada`"
                    data-testid="amortizacion-row"
                    @click="cuota.cancelado ? despagarCuota(deuda, cuota.numero) : pagarCuota(deuda, cuota.numero)"
                    @keydown.enter.prevent="cuota.cancelado ? despagarCuota(deuda, cuota.numero) : pagarCuota(deuda, cuota.numero)"
                    @keydown.space.prevent="cuota.cancelado ? despagarCuota(deuda, cuota.numero) : pagarCuota(deuda, cuota.numero)"
                  >
                    <span style="width: 32px; display: flex; align-items: center;">
                      <Check v-if="cuota.cancelado" :size="13" style="color: #1E9E6A;" aria-hidden="true" />
                      <span
                        v-else
                        :style="{ color: cuota.esCuotaActual ? '#D4A017' : '#B8B1A2', fontWeight: '700' }"
                      >{{ cuota.numero }}</span>
                    </span>
                    <span :style="{ flex: 1, color: cuota.cancelado ? '#1E9E6A' : '#5A5448', fontWeight: '600' }">{{ cuota.fecha }}</span>
                    <span style="width: 78px; text-align: right; font-weight: 600; color: #1C1A15;">{{ fmtSoles(cuota.pago) }}</span>
                    <span style="width: 88px; text-align: right; font-weight: 600; color: #9A9384;">{{ fmtSoles(cuota.saldo) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>

  <AppModal
    :open="isModalOpen"
    :title="modalTitle"
    :subtitle="modalSubtitle"
    accent-color="#D4A017"
    @close="closeModal"
  >
    <form data-testid="creditos-form" novalidate autocomplete="off" @submit.prevent="handleSubmit">
      <div class="space-y-5">
        <div class="space-y-2">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Datos</p>
          <div>
            <label for="nombre-persona" class="block text-xs font-medium text-slate-600 mb-1.5">Nombre de la persona / entidad</label>
            <input
              id="nombre-persona"
              v-model="form.nombrePersona"
              type="text"
              autocomplete="off"
              placeholder="Ej: BCP"
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
          @click="closeModal"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSubmitting"
          class="flex-[2] py-2.5 text-sm text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #D4A017 0%, #A87A0F 100%);"
          data-testid="submit-button"
          @click="handleSubmit"
        >
          {{ submitLabel }}
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
