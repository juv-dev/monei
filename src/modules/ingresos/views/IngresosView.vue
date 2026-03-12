<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { TrendingUp, Trash2, Inbox, Pencil, Check, X } from 'lucide-vue-next'
import { useIngresos } from '../composables/useIngresos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, sanitize } from '~/shared/utils/validation'
import type { Ingreso } from '../types'

const { ingresos, isLoading, isError, totalIngresos, addIngreso, updateIngreso, removeIngreso, isAdding, isUpdating } =
  useIngresos()

const { startLoading, finishLoading, showToast } = useAppFeedback()

const form = reactive({ monto: '', descripcion: '' })
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

const editingId = ref<string | null>(null)
const editForm = reactive({ monto: '', descripcion: '' })

function startEdit(ingreso: Ingreso) {
  editingId.value = ingreso.id
  editForm.descripcion = ingreso.descripcion
  editForm.monto = String(ingreso.monto)
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit(id: string) {
  const monto = parseMoneyInput(editForm.monto)
  if (!editForm.descripcion.trim()) return
  if (isNaN(monto) || monto <= 0) return
  updateIngreso(id, { monto, descripcion: editForm.descripcion.trim() })
}

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    editingId.value = null
  }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function openModal(): void {
  formError.value = null
  isModalOpen.value = true
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Ingreso agregado correctamente')
    isModalOpen.value = false
  }
})

function handleSubmit(): void {
  formError.value = null
  const monto = parseMoneyInput(form.monto)
  const descripcion = sanitize(form.descripcion)

  const descResult = validateDescripcion(descripcion)
  if (!descResult.valid) {
    formError.value = descResult.error!
    return
  }
  const montoResult = validateMonto(monto)
  if (!montoResult.valid) {
    formError.value = montoResult.error!
    return
  }

  startLoading('#3E6F73')
  addIngreso({ monto, descripcion })
  form.monto = ''
  form.descripcion = ''
}

function handleDelete(id: string): void {
  removeIngreso(id)
}
</script>

<template>
  <div class="min-h-screen bg-[#F0F2F5]" data-testid="ingresos-view">
    <div class="max-w-5xl mx-auto p-5 lg:p-8 space-y-5">
      <PageHeader
        title="Ingresos"
        subtitle="Registra y gestiona tus fuentes de ingreso"
        button-label="Agregar ingreso"
        button-color="#3E6F73"
        button-testid="open-modal-button"
        @action="openModal"
      />

      <div
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #3e6f73 0%, #2c5558 100%)"
        data-testid="summary-card"
      >
        <div class="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-[0.08]" style="background: white"></div>
        <div class="absolute -bottom-14 -left-6 w-52 h-52 rounded-full opacity-[0.05]" style="background: white"></div>

        <div class="relative z-10 flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Total Ingresos</p>
            <p class="text-4xl lg:text-5xl font-black text-white tracking-tight" data-testid="total-ingresos">
              {{ formatCurrency(totalIngresos) }}
            </p>
            <div class="flex gap-5 mt-5 pt-5 border-t border-white/20">
              <div>
                <p class="text-white/50 text-xs mb-0.5">Registros</p>
                <p class="text-white font-bold">{{ ingresos.length }}</p>
              </div>
              <div>
                <p class="text-white/50 text-xs mb-0.5">Promedio</p>
                <p class="text-white font-bold text-sm">
                  {{ ingresos.length ? formatCurrency(totalIngresos / ingresos.length) : '—' }}
                </p>
              </div>
            </div>
          </div>
          <div class="shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
            <TrendingUp :size="30" class="text-white" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-[#EEEEF0] overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
          <h2 class="text-sm font-bold text-[#1A1A2E]">Lista de Ingresos</h2>
          <span
            v-if="ingresos.length > 0"
            class="bg-[#F0F2F5] text-[#64748B] text-xs font-semibold rounded-full px-2.5 py-0.5"
          >
            {{ ingresos.length }}
          </span>
        </div>

        <div
          v-if="isLoading"
          class="flex items-center justify-center gap-2 py-16 text-[#94A3B8]"
          data-testid="loading-state"
        >
          <span class="text-sm">Cargando...</span>
        </div>

        <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #c65a3a" data-testid="error-state">
          Error al cargar los ingresos
        </div>

        <EmptyState
          v-else-if="ingresos.length === 0"
          :icon="Inbox"
          color="#3E6F73"
          title="No hay ingresos registrados"
          subtitle="Agrega tu primer ingreso usando el botón de arriba"
          testid="empty-state"
          :inline="true"
        />

        <div v-else class="divide-y divide-[#F0F2F5]" data-testid="ingresos-list">
          <div
            v-for="ingreso in ingresos"
            :key="ingreso.id"
            class="hover:bg-[#F8F9FB] transition-colors group"
            data-testid="ingreso-item"
          >
            <div v-if="editingId !== ingreso.id" class="flex items-center gap-3 px-6 py-3.5">
              <div
                class="w-10 h-10 rounded-xl bg-[#3E6F73]/10 flex items-center justify-center text-sm font-bold shrink-0"
                style="color: #3e6f73"
                aria-hidden="true"
              >
                {{ ingreso.descripcion.charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-[#1A1A2E] truncate" data-testid="ingreso-descripcion">
                  {{ ingreso.descripcion }}
                </p>
                <p class="text-xs text-[#94A3B8]">
                  {{ new Date(ingreso.createdAt).toLocaleDateString('es-PE') }}
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="text-sm font-bold tabular-nums" style="color: #3e6f73" data-testid="ingreso-monto">
                  +{{ formatCurrency(ingreso.monto) }}
                </span>
                <button
                  class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#3E6F73] hover:bg-[#3E6F73]/8 transition-all"
                  :aria-label="`Editar ingreso ${ingreso.descripcion}`"
                  data-testid="edit-button"
                  @click="startEdit(ingreso)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-colors"
                  :aria-label="`Eliminar ingreso ${ingreso.descripcion}`"
                  data-testid="delete-button"
                  @click="handleDelete(ingreso.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div v-else class="flex items-center gap-2 px-6 py-3">
              <input
                v-model="editForm.descripcion"
                type="text"
                placeholder="Descripción"
                class="flex-1 px-3 py-2 border border-[#EEEEF0] rounded-xl text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#3E6F73]/30"
                data-testid="edit-descripcion-input"
                @keydown.enter.prevent="saveEdit(ingreso.id)"
                @keydown.esc.prevent="cancelEdit"
              />
              <input
                type="text"
                inputmode="decimal"
                :value="editForm.monto"
                placeholder="0.00"
                class="w-28 px-3 py-2 border border-[#EEEEF0] rounded-xl text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#3E6F73]/30"
                data-testid="edit-monto-input"
                @input="onDecimalInput($event, (v) => (editForm.monto = v))"
                @blur="editForm.monto = formatMoneyDisplay(editForm.monto)"
                @keydown.enter.prevent="saveEdit(ingreso.id)"
                @keydown.esc.prevent="cancelEdit"
              />
              <button
                :disabled="isUpdating"
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#3E6F73]/10 text-[#3E6F73] hover:bg-[#3E6F73]/20 disabled:opacity-50 transition-colors"
                aria-label="Guardar cambios"
                data-testid="save-edit-button"
                @click="saveEdit(ingreso.id)"
              >
                <Check :size="14" />
              </button>
              <button
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F2F5] text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
                aria-label="Cancelar edición"
                data-testid="cancel-edit-button"
                @click="cancelEdit"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppModal :open="isModalOpen" title="Agregar Ingreso" accent-color="#3E6F73" @close="isModalOpen = false">
    <form data-testid="ingresos-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label
            for="descripcion-ingreso"
            class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide"
          >
            Descripción
          </label>
          <input
            id="descripcion-ingreso"
            v-model="form.descripcion"
            type="text"
            placeholder="Ej: Salario mensual"
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3E6F73]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="descripcion-input"
          />
        </div>

        <div>
          <label for="monto-ingreso" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
            Monto (S/)
          </label>
          <input
            id="monto-ingreso"
            type="text"
            inputmode="decimal"
            :value="form.monto"
            placeholder="0.00"
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3E6F73]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="monto-input"
            @input="onDecimalInput($event, (v) => (form.monto = v))"
            @blur="form.monto = formatMoneyDisplay(form.monto)"
          />
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
          style="background: linear-gradient(135deg, #3e6f73 0%, #2c5558 100%)"
          data-testid="submit-button"
        >
          {{ isAdding ? 'Agregando...' : '+ Agregar ingreso' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>
