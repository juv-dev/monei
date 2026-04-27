<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { TrendingUp, Trash2, Inbox, Pencil, Check, X, ArrowUpDown, Search, Plus } from 'lucide-vue-next'
import { useIngresos } from '../composables/useIngresos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import MonthSelector from '~/shared/components/ui/MonthSelector.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, sanitize } from '~/shared/utils/validation'
import type { Ingreso } from '../types'

const { ingresos, isLoading, isError, totalIngresos, addIngreso, updateIngreso, removeIngreso, isAdding, isUpdating, isRemoving } =
  useIngresos()

const { startLoading, finishLoading, showToast } = useAppFeedback()

const form = reactive({ monto: '', descripcion: '' })
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

const editingId = ref<string | null>(null)
const editForm = reactive({ monto: '', descripcion: '' })

const searchQuery = ref('')
const sortDesc = ref(true)

const filteredIngresos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = ingresos.value.slice()
  if (q) list = list.filter((i) => i.descripcion.toLowerCase().includes(q))
  list.sort((a, b) => (sortDesc.value ? b.monto - a.monto : a.monto - b.monto))
  return list
})

const avgIngreso = computed(() =>
  ingresos.value.length ? totalIngresos.value / ingresos.value.length : 0,
)
const topIngreso = computed(() =>
  ingresos.value.length ? Math.max(...ingresos.value.map((i) => i.monto)) : 0,
)

function percentOfTotal(monto: number): number {
  if (totalIngresos.value <= 0) return 0
  return Math.min(100, Math.round((monto / totalIngresos.value) * 100))
}

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

  startLoading('#10B981')
  addIngreso({ monto, descripcion })
  form.monto = ''
  form.descripcion = ''
}

const pendingDeleteId = ref<string | null>(null)

function handleDelete(id: string): void {
  pendingDeleteId.value = id
}

function confirmDelete(): void {
  if (pendingDeleteId.value) removeIngreso(pendingDeleteId.value)
  pendingDeleteId.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F6F1]" data-testid="ingresos-view">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div class="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">Ingresos</h1>
          <p class="text-sm text-[#64748B] mt-0.5">Registrá y gestioná tus fuentes de ingreso</p>
        </div>
        <div class="flex items-center gap-2">
          <MonthSelector />
          <button
            class="flex items-center gap-2 py-2.5 px-4 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 text-sm"
            style="background: linear-gradient(135deg, #10B981 0%, #10B981CC 100%)"
            data-testid="open-modal-button"
            @click="openModal"
          >
            <Plus :size="16" aria-hidden="true" />
            Agregar ingreso
          </button>
        </div>
      </div>

      <!-- Stat grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 mb-6" data-testid="summary-card">
        <div
          class="rounded-2xl p-4 border shadow-sm"
          style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-color: rgba(16, 185, 129, 0.25);"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(5, 150, 105, 0.12);">
              <TrendingUp :size="14" style="color: #059669" aria-hidden="true" />
            </div>
            <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: #047857">Total</p>
          </div>
          <p class="text-xl lg:text-2xl font-black tabular-nums tracking-tight" style="color: #064E3B" data-testid="total-ingresos">
            {{ formatCurrency(totalIngresos) }}
          </p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Registros</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">{{ ingresos.length }}</p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Promedio</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">
            {{ ingresos.length ? formatCurrency(avgIngreso) : '—' }}
          </p>
        </div>

        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Mayor ingreso</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular-nums tracking-tight">
            {{ ingresos.length ? formatCurrency(topIngreso) : '—' }}
          </p>
        </div>
      </div>

      <!-- Lista de ingresos -->
      <div class="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-slate-900">Lista de Ingresos</h2>
              <p class="text-xs text-slate-500 mt-0.5">Todos los registros del mes</p>
            </div>
            <span
              v-if="ingresos.length > 0"
              class="bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full px-3 py-1 tabular-nums"
            >
              {{ ingresos.length }}
            </span>
          </div>

          <div v-if="ingresos.length > 0" class="flex gap-2">
            <div class="relative flex-1">
              <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar ingreso..."
                class="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition-all"
              />
              <button
                v-if="searchQuery"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                @click="searchQuery = ''"
                aria-label="Limpiar búsqueda"
              >
                <X :size="12" />
              </button>
            </div>
            <button
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              :title="sortDesc ? 'Mayor a menor' : 'Menor a mayor'"
              @click="sortDesc = !sortDesc"
            >
              <ArrowUpDown :size="12" />
              {{ sortDesc ? 'Mayor' : 'Menor' }}
            </button>
          </div>
        </div>

        <div
          v-if="isLoading"
          class="flex items-center justify-center gap-2 py-16 text-slate-400"
          data-testid="loading-state"
        >
          <span class="text-sm">Cargando...</span>
        </div>

        <div v-else-if="isError" class="text-center py-16 text-sm text-rose-600" data-testid="error-state">
          Error al cargar los ingresos
        </div>

        <EmptyState
          v-else-if="ingresos.length === 0"
          :icon="Inbox"
          color="#10B981"
          title="No hay ingresos registrados"
          subtitle="Registrá tus fuentes de ingreso para este mes"
          action-label="Agregar ingreso"
          testid="empty-state"
          :inline="true"
          @action="openModal"
        />

        <div
          v-else-if="filteredIngresos.length === 0"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2">
            <Search :size="20" class="text-slate-400" />
          </div>
          <p class="text-sm font-semibold text-slate-700">Sin resultados</p>
          <p class="text-xs text-slate-500 mt-1">Probá con otro término</p>
        </div>

        <div v-else class="divide-y divide-slate-50" data-testid="ingresos-list">
          <div
            v-for="ingreso in filteredIngresos"
            :key="ingreso.id"
            class="group relative hover:bg-slate-50/60 transition-colors"
            data-testid="ingreso-item"
          >
            <div v-if="editingId !== ingreso.id" class="flex items-center gap-3 px-6 py-3.5">
              <span
                class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500"
              ></span>
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 text-emerald-700 bg-emerald-50"
                aria-hidden="true"
              >
                {{ ingreso.descripcion.charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="text-sm font-semibold text-slate-900 truncate" data-testid="ingreso-descripcion">
                    {{ ingreso.descripcion }}
                  </p>
                  <span class="text-[10px] text-slate-400">
                    {{ new Date(ingreso.createdAt).toLocaleDateString('es-PE') }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      class="h-full rounded-full bg-emerald-500 transition-all"
                      :style="{ width: percentOfTotal(ingreso.monto) + '%' }"
                    ></div>
                  </div>
                  <span class="text-[10px] text-slate-400 tabular-nums">{{ percentOfTotal(ingreso.monto) }}%</span>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <span class="text-sm font-bold tabular-nums text-emerald-600 mr-2" data-testid="ingreso-monto">
                  +{{ formatCurrency(ingreso.monto) }}
                </span>
                <button
                  class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  :aria-label="`Editar ingreso ${ingreso.descripcion}`"
                  data-testid="edit-button"
                  @click="startEdit(ingreso)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  :aria-label="`Eliminar ingreso ${ingreso.descripcion}`"
                  :disabled="isRemoving"
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
                class="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                data-testid="edit-descripcion-input"
                @keydown.enter.prevent="saveEdit(ingreso.id)"
                @keydown.esc.prevent="cancelEdit"
              />
              <input
                type="text"
                inputmode="decimal"
                :value="editForm.monto"
                placeholder="0.00"
                class="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                data-testid="edit-monto-input"
                @input="onDecimalInput($event, (v) => (editForm.monto = v))"
                @blur="editForm.monto = formatMoneyDisplay(editForm.monto)"
                @keydown.enter.prevent="saveEdit(ingreso.id)"
                @keydown.esc.prevent="cancelEdit"
              />
              <button
                :disabled="isUpdating"
                class="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                aria-label="Guardar cambios"
                data-testid="save-edit-button"
                @click="saveEdit(ingreso.id)"
              >
                <Check :size="14" />
              </button>
              <button
                class="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
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

  <AppModal :open="isModalOpen" title="Agregar Ingreso" accent-color="#10B981" @close="isModalOpen = false">
    <form data-testid="ingresos-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label
            for="descripcion-ingreso"
            class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
          >
            Descripción
          </label>
          <input
            id="descripcion-ingreso"
            v-model="form.descripcion"
            type="text"
            placeholder="Ej: Salario mensual"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition-all"
            data-testid="descripcion-input"
          />
        </div>

        <div>
          <label for="monto-ingreso" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Monto (S/)
          </label>
          <input
            id="monto-ingreso"
            type="text"
            inputmode="decimal"
            :value="form.monto"
            placeholder="0.00"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition-all"
            data-testid="monto-input"
            @input="onDecimalInput($event, (v) => (form.monto = v))"
            @blur="form.monto = formatMoneyDisplay(form.monto)"
          />
        </div>

        <p
          v-if="formError"
          class="text-sm bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-rose-700"
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          :disabled="isAdding"
          class="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #059669 0%, #10B981 100%);"
          data-testid="submit-button"
        >
          {{ isAdding ? 'Agregando...' : '+ Agregar ingreso' }}
        </button>
      </div>
    </form>
  </AppModal>

  <ConfirmDialog
    :open="pendingDeleteId !== null"
    @confirm="confirmDelete"
    @cancel="pendingDeleteId = null"
  />
</template>
