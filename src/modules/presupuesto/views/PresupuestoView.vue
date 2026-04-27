<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import {
  Wallet,
  ChevronDown,
  ChevronUp,
  Trash2,
  Inbox,
  Plus,
  GripVertical,
  Pencil,
  Check,
  X,
  Search,
  ArrowDownUp,
  TrendingDown,
  Copy,
} from 'lucide-vue-next'
import { usePresupuesto } from '../composables/usePresupuesto'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { useAuthStore } from '~/stores/auth'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import MonthSelector from '~/shared/components/ui/MonthSelector.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, sanitize } from '~/shared/utils/validation'
import type { GastoPresupuesto } from '~/shared/types'

const {
  porCategoria,
  categorias,
  isLoading,
  isError,
  totalGastado,
  addGasto,
  updateGasto,
  removeGasto,
  isAdding,
  isUpdating,
} = usePresupuesto()

const { startLoading, finishLoading, showToast } = useAppFeedback()
const auth = useAuthStore()
const userId = computed(() => auth.userId)

const form = reactive({ monto: '', descripcion: '', categoria: '' })
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

const categoriasExpandidas = ref<Set<string>>(new Set())
const searchTerm = ref('')
const sortBy = ref<'subtotal' | 'nombre'>('subtotal')

const orderKey = computed(() => `finance_${userId.value}_presupuesto_cat_order`)
const categoryOrder = ref<string[]>([])

watch(
  userId,
  (id) => {
    if (!id) return
    const raw = localStorage.getItem(`finance_${id}_presupuesto_cat_order`)
    categoryOrder.value = raw ? (JSON.parse(raw) as string[]) : []
  },
  { immediate: true },
)

watch(categorias, (cats) => {
  const missing = cats.filter((c) => !categoryOrder.value.includes(c))
  if (missing.length) categoryOrder.value = [...categoryOrder.value, ...missing]
})

const sortedPorCategoria = computed(() => {
  const allNames = [
    ...categoryOrder.value,
    ...porCategoria.value.map((c) => c.nombre).filter((n) => !categoryOrder.value.includes(n)),
  ]
  return allNames.map(
    (nombre) => porCategoria.value.find((c) => c.nombre === nombre) ?? { nombre, items: [], subtotal: 0 },
  )
})

const displayCategorias = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  let list = sortedPorCategoria.value
  if (q) {
    list = list.filter((c) => c.nombre.toLowerCase().includes(q) || c.items.some((i) => i.descripcion.toLowerCase().includes(q)))
  }
  if (sortBy.value === 'subtotal') {
    list = [...list].sort((a, b) => b.subtotal - a.subtotal)
  } else if (sortBy.value === 'nombre') {
    list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }
  return list
})

const seccionMayor = computed(() => {
  if (!porCategoria.value.length) return null
  return porCategoria.value.reduce((a, b) => (a.subtotal > b.subtotal ? a : b))
})

const promedioSeccion = computed(() => {
  if (!porCategoria.value.length) return 0
  return totalGastado.value / porCategoria.value.length
})

function percentOfTotal(value: number): number {
  if (!totalGastado.value) return 0
  return Math.round((value / totalGastado.value) * 100)
}

const draggingNombre = ref<string | null>(null)
const dragOverNombre = ref<string | null>(null)

function onDragStart(event: DragEvent, nombre: string) {
  draggingNombre.value = nombre
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', nombre)
  }
}

function onDragOver(event: DragEvent, nombre: string) {
  event.preventDefault()
  if (draggingNombre.value && draggingNombre.value !== nombre) {
    dragOverNombre.value = nombre
  }
}

function onDrop(event: DragEvent, targetNombre: string) {
  event.preventDefault()
  if (!draggingNombre.value || draggingNombre.value === targetNombre) return

  const order = [...categoryOrder.value]
  const fromIdx = order.indexOf(draggingNombre.value)
  const toIdx = order.indexOf(targetNombre)

  if (fromIdx !== -1 && toIdx !== -1) {
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, draggingNombre.value)
    categoryOrder.value = order
    localStorage.setItem(orderKey.value, JSON.stringify(order))
  }

  draggingNombre.value = null
  dragOverNombre.value = null
}

function onDragEnd() {
  draggingNombre.value = null
  dragOverNombre.value = null
}

const pendingDeleteGastoId = ref<string | null>(null)
const pendingDeleteCategoria = ref<string | null>(null)

function confirmDeleteGasto(): void {
  if (pendingDeleteGastoId.value) removeGasto(pendingDeleteGastoId.value)
  pendingDeleteGastoId.value = null
}

function deleteCategoria(nombre: string) {
  const cat = porCategoria.value.find((c) => c.nombre === nombre)
  cat?.items.forEach((g) => removeGasto(g.id))
  categoryOrder.value = categoryOrder.value.filter((n) => n !== nombre)
  localStorage.setItem(orderKey.value, JSON.stringify(categoryOrder.value))
  categoriasExpandidas.value.delete(nombre)
  pendingDeleteCategoria.value = null
}

function requestDeleteCategoria(nombre: string): void {
  pendingDeleteCategoria.value = nombre
}

const addingToCategoria = ref<string | null>(null)
const addInlineForm = reactive({ monto: '', descripcion: '' })
const addInlineError = ref<string | null>(null)

function startAddItem(categoriaNombre: string) {
  addingToCategoria.value = categoriaNombre
  addInlineForm.monto = ''
  addInlineForm.descripcion = ''
  addInlineError.value = null
}

function cancelAddItem() {
  addingToCategoria.value = null
}

function saveNewItem(categoriaNombre: string) {
  addInlineError.value = null
  const monto = parseMoneyInput(addInlineForm.monto)
  const descripcion = sanitize(addInlineForm.descripcion)

  const descResult = validateDescripcion(descripcion)
  if (!descResult.valid) {
    addInlineError.value = descResult.error!
    return
  }
  const montoResult = validateMonto(monto)
  if (!montoResult.valid) {
    addInlineError.value = montoResult.error!
    return
  }
  startLoading('#F97316')
  addGasto({ monto, descripcion, categoria: categoriaNombre })
}

const editingCategoria = ref<string | null>(null)
const editCategoriaNombre = ref('')

function startEditCategoria(nombre: string) {
  editingCategoria.value = nombre
  editCategoriaNombre.value = nombre
}

function cancelEditCategoria() {
  editingCategoria.value = null
}

function saveEditCategoria(oldNombre: string) {
  const newNombre = editCategoriaNombre.value.trim()
  if (!newNombre || newNombre === oldNombre) {
    editingCategoria.value = null
    return
  }
  const cat = porCategoria.value.find((c) => c.nombre === oldNombre)
  if (!cat) {
    editingCategoria.value = null
    return
  }
  cat.items.forEach((gasto) => {
    updateGasto(gasto.id, { categoria: newNombre })
  })
  const idx = categoryOrder.value.indexOf(oldNombre)
  if (idx !== -1) {
    const newOrder = [...categoryOrder.value]
    newOrder[idx] = newNombre
    categoryOrder.value = newOrder
    localStorage.setItem(orderKey.value, JSON.stringify(newOrder))
  }
  if (categoriasExpandidas.value.has(oldNombre)) {
    categoriasExpandidas.value.delete(oldNombre)
    categoriasExpandidas.value.add(newNombre)
  }
  editingCategoria.value = null
}

const editingId = ref<string | null>(null)
const editForm = reactive({ monto: '', descripcion: '', categoria: '' })

function startEdit(gasto: GastoPresupuesto) {
  editingId.value = gasto.id
  editForm.monto = String(gasto.monto)
  editForm.descripcion = gasto.descripcion
  editForm.categoria = gasto.categoria
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit(id: string) {
  const monto = parseMoneyInput(editForm.monto)
  if (isNaN(monto) || monto <= 0) return
  if (!editForm.descripcion.trim()) return
  updateGasto(id, {
    monto,
    descripcion: editForm.descripcion.trim(),
    categoria: editForm.categoria.trim() || 'General',
  })
}

watch(isUpdating, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    editingId.value = null
  }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function toggleCategoria(nombre: string): void {
  if (categoriasExpandidas.value.has(nombre)) {
    categoriasExpandidas.value.delete(nombre)
  } else {
    categoriasExpandidas.value.add(nombre)
  }
}

function openModal(): void {
  formError.value = null
  isModalOpen.value = true
}

watch(isAdding, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    finishLoading()
    showToast('Egreso agregado correctamente')
    addingToCategoria.value = null
  }
})

function handleSubmit(): void {
  formError.value = null
  const nombreCategoria = form.categoria.trim()

  if (!nombreCategoria) {
    formError.value = 'La sección es requerida'
    return
  }

  if (!categoryOrder.value.includes(nombreCategoria)) {
    categoryOrder.value = [...categoryOrder.value, nombreCategoria]
    localStorage.setItem(orderKey.value, JSON.stringify(categoryOrder.value))
  }
  categoriasExpandidas.value.add(nombreCategoria)
  startAddItem(nombreCategoria)
  form.categoria = ''
  isModalOpen.value = false
}

function handleDelete(id: string): void {
  pendingDeleteGastoId.value = id
}

type Segment = { type: 'text' | 'number'; value: string }

function tokenizeDescripcion(text: string): Segment[] {
  const regex = /\d+/g
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'number', value: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments.length ? segments : [{ type: 'text', value: text }]
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    showToast('Copiado al portapapeles')
  } catch {
    showToast('No se pudo copiar', 'error')
  }
}
</script>

<template>
  <div class="min-h-full bg-[#F8F6F1]" data-testid="presupuesto-view">
    <div class="max-w-6xl mx-auto p-5 lg:p-8 space-y-5">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">Egresos</h1>
          <p class="text-sm text-[#64748B] mt-0.5">Organizá tus egresos por secciones</p>
        </div>
        <div class="flex items-center gap-2">
          <MonthSelector />
          <button
            class="flex items-center gap-2 py-2.5 px-4 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 text-sm"
            style="background: linear-gradient(135deg, #F97316 0%, #F97316CC 100%)"
            data-testid="open-modal-button"
            @click="openModal"
          >
            <Plus :size="16" aria-hidden="true" />
            Nueva sección
          </button>
        </div>
      </div>

      <!-- Stat grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="summary-card">
        <!-- Total (highlighted) -->
        <div
          class="rounded-2xl p-4 border shadow-sm"
          style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-color: rgba(249, 115, 22, 0.25);"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(234, 88, 12, 0.12);">
              <Wallet :size="14" style="color: #EA580C" aria-hidden="true" />
            </div>
            <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: #C2410C">Total</p>
          </div>
          <p class="text-xl lg:text-2xl font-black tabular tracking-tight" style="color: #9A3412" data-testid="total-gastado">
            {{ formatCurrency(totalGastado) }}
          </p>
        </div>

        <!-- Secciones -->
        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Secciones</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular tracking-tight">{{ porCategoria.length }}</p>
        </div>

        <!-- Mayor -->
        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Mayor sección</p>
          <p class="text-sm lg:text-base font-bold text-slate-900 truncate">{{ seccionMayor ? seccionMayor.nombre : '—' }}</p>
          <p v-if="seccionMayor" class="text-[11px] text-slate-500 tabular mt-0.5">{{ formatCurrency(seccionMayor.subtotal) }}</p>
        </div>

        <!-- Promedio -->
        <div class="rounded-2xl p-4 bg-white border border-slate-200/60 shadow-sm">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Promedio</p>
          <p class="text-xl lg:text-2xl font-black text-slate-900 tabular tracking-tight">{{ formatCurrency(promedioSeccion) }}</p>
        </div>
      </div>

      <!-- Toolbar -->
      <div v-if="sortedPorCategoria.length" class="flex items-center gap-3">
        <div class="relative flex-1">
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar sección o ítem..."
            class="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200/60 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40 transition-all"
            data-testid="search-input"
          />
        </div>
        <button
          type="button"
          class="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/60 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
          data-testid="sort-toggle"
          @click="sortBy = sortBy === 'subtotal' ? 'nombre' : 'subtotal'"
        >
          <ArrowDownUp :size="13" />
          {{ sortBy === 'subtotal' ? 'Monto' : 'Nombre' }}
        </button>
      </div>

      <!-- Lista -->
      <div class="space-y-3">
        <div v-if="isLoading" class="text-center py-16 text-slate-400" data-testid="loading-state">Cargando...</div>

        <div v-else-if="isError" class="text-center py-16 text-sm text-orange-600" data-testid="error-state">
          Error al cargar los egresos
        </div>

        <EmptyState
          v-else-if="sortedPorCategoria.length === 0"
          :icon="Inbox"
          color="#F97316"
          title="No hay egresos registrados"
          subtitle="Creá tu primera sección de gastos para este mes"
          action-label="Nueva sección"
          testid="empty-state"
          @action="openModal"
        />

        <div
          v-for="cat in displayCategorias"
          :key="cat.nombre"
          draggable="true"
          class="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden transition-all select-none"
          :class="{
            'opacity-40 scale-[0.98]': draggingNombre === cat.nombre,
            'ring-2 ring-orange-400/40 scale-[1.005]': dragOverNombre === cat.nombre && draggingNombre !== cat.nombre,
          }"
          data-testid="categoria-grupo"
          @dragstart="onDragStart($event, cat.nombre)"
          @dragover="onDragOver($event, cat.nombre)"
          @drop="onDrop($event, cat.nombre)"
          @dragend="onDragEnd"
        >
          <div class="flex items-stretch">
            <div
              class="flex items-center px-2.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors"
              aria-hidden="true"
            >
              <GripVertical :size="15" />
            </div>

            <button
              type="button"
              class="flex-1 flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors text-left group/header"
              :aria-expanded="categoriasExpandidas.has(cat.nombre)"
              data-testid="categoria-header"
              @click="editingCategoria !== cat.nombre && toggleCategoria(cat.nombre)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style="background: rgba(249, 115, 22, 0.1); color: #EA580C"
                  aria-hidden="true"
                >
                  {{ cat.nombre.charAt(0).toUpperCase() }}
                </div>

                <template v-if="editingCategoria === cat.nombre">
                  <input
                    v-model="editCategoriaNombre"
                    class="text-sm font-bold text-slate-900 border border-orange-400 rounded-md px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    data-testid="edit-categoria-input"
                    @click.stop
                    @keydown.enter.stop="saveEditCategoria(cat.nombre)"
                    @keydown.escape.stop="cancelEditCategoria"
                  />
                  <button
                    class="w-6 h-6 rounded-md flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-all"
                    aria-label="Guardar nombre"
                    data-testid="save-categoria-button"
                    @click.stop="saveEditCategoria(cat.nombre)"
                  >
                    <Check :size="13" />
                  </button>
                  <button
                    class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
                    aria-label="Cancelar edición"
                    data-testid="cancel-categoria-button"
                    @click.stop="cancelEditCategoria"
                  >
                    <X :size="13" />
                  </button>
                </template>

                <template v-else>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-slate-900 text-sm truncate" data-testid="categoria-nombre">{{ cat.nombre }}</span>
                      <button
                        class="opacity-0 group-hover/header:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
                        :aria-label="`Editar nombre de ${cat.nombre}`"
                        data-testid="edit-categoria-button"
                        @click.stop="startEditCategoria(cat.nombre)"
                      >
                        <Pencil :size="11" />
                      </button>
                    </div>
                    <span class="text-[11px] text-slate-500 mt-0.5">
                      {{ cat.items.length }} ítem{{ cat.items.length !== 1 ? 's' : '' }} · {{ percentOfTotal(cat.subtotal) }}%
                    </span>
                  </div>
                </template>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex flex-col items-end">
                  <span class="font-black text-sm text-slate-900 tabular" data-testid="categoria-subtotal">
                    {{ formatCurrency(cat.subtotal) }}
                  </span>
                  <div class="w-20 h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      style="background: linear-gradient(90deg, #F97316 0%, #FB923C 100%);"
                      :style="{ width: percentOfTotal(cat.subtotal) + '%' }"
                    ></div>
                  </div>
                </div>
                <button
                  class="opacity-0 group-hover/header:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  :aria-label="`Eliminar sección ${cat.nombre}`"
                  data-testid="delete-categoria-button"
                  @click.stop="requestDeleteCategoria(cat.nombre)"
                >
                  <Trash2 :size="13" />
                </button>
                <component
                  :is="categoriasExpandidas.has(cat.nombre) ? ChevronUp : ChevronDown"
                  :size="16"
                  class="text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </button>
          </div>

          <div v-if="categoriasExpandidas.has(cat.nombre)" class="border-t border-slate-100">
            <div data-testid="gastos-list" class="divide-y divide-slate-100">
              <div
                v-for="gasto in cat.items"
                :key="gasto.id"
                class="hover:bg-slate-50/70 transition-colors group"
                data-testid="gasto-item"
              >
                <div v-if="editingId !== gasto.id" class="flex items-center justify-between px-5 py-3">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style="background: rgba(249, 115, 22, 0.08); color: #F97316"
                      aria-hidden="true"
                    >
                      <TrendingDown :size="14" />
                    </div>
                    <span
                      class="text-sm text-slate-700 truncate select-text flex items-center gap-1 flex-wrap"
                      data-testid="gasto-descripcion"
                      @click.stop
                    >
                      <template v-for="(seg, idx) in tokenizeDescripcion(gasto.descripcion)" :key="idx">
                        <template v-if="seg.type === 'number'">
                          <span
                            class="px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 tabular"
                          >{{ seg.value }}</span>
                          <button
                            type="button"
                            class="w-5 h-5 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            :aria-label="`Copiar ${seg.value}`"
                            :data-testid="`copy-number-${seg.value}`"
                            @click.stop="copyText(seg.value)"
                          >
                            <Copy :size="12" />
                          </button>
                        </template>
                        <span v-else>{{ seg.value }}</span>
                      </template>
                    </span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <span class="text-sm font-bold tabular text-slate-900" data-testid="gasto-monto">
                      {{ formatCurrency(gasto.monto) }}
                    </span>
                    <button
                      class="lg:opacity-0 lg:group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      :aria-label="`Editar ${gasto.descripcion}`"
                      data-testid="edit-button"
                      @click.stop="startEdit(gasto)"
                    >
                      <Pencil :size="13" />
                    </button>
                    <button
                      class="lg:opacity-0 lg:group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      :aria-label="`Eliminar ${gasto.descripcion}`"
                      data-testid="delete-button"
                      @click.stop="handleDelete(gasto.id)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </div>

                <div v-else class="flex items-center gap-2 px-5 py-3">
                  <input
                    v-model="editForm.descripcion"
                    type="text"
                    placeholder="Descripción"
                    class="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40"
                    data-testid="edit-descripcion-input"
                    @keydown.enter.prevent="saveEdit(gasto.id)"
                    @keydown.esc.prevent="cancelEdit"
                  />
                  <input
                    type="text"
                    inputmode="decimal"
                    :value="editForm.monto"
                    placeholder="0.00"
                    class="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40"
                    data-testid="edit-monto-input"
                    @input="onDecimalInput($event, (v) => (editForm.monto = v))"
                    @blur="editForm.monto = formatMoneyDisplay(editForm.monto)"
                    @keydown.enter.prevent="saveEdit(gasto.id)"
                    @keydown.esc.prevent="cancelEdit"
                  />
                  <button
                    :disabled="isUpdating"
                    class="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600 hover:bg-orange-200 disabled:opacity-50 transition-colors shrink-0"
                    aria-label="Guardar cambios"
                    data-testid="save-edit-button"
                    @click.stop="saveEdit(gasto.id)"
                  >
                    <Check :size="13" />
                  </button>
                  <button
                    class="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                    aria-label="Cancelar edición"
                    data-testid="cancel-edit-button"
                    @click.stop="cancelEdit"
                  >
                    <X :size="13" />
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="cat.items.length === 0 && addingToCategoria !== cat.nombre"
              class="px-5 py-5 flex items-center justify-center gap-2 text-slate-400 text-sm"
              data-testid="categoria-empty-state"
            >
              <Inbox :size="15" aria-hidden="true" />
              Sin ítems todavía
            </div>

            <div
              v-if="addingToCategoria === cat.nombre"
              class="px-5 py-3 space-y-2 border-t border-slate-100 bg-orange-50/40"
              data-testid="inline-add-form"
            >
              <div class="flex gap-2">
                <input
                  v-model="addInlineForm.descripcion"
                  type="text"
                  placeholder="Descripción del egreso"
                  class="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40"
                  data-testid="inline-descripcion-input"
                  @keydown.enter.prevent="saveNewItem(cat.nombre)"
                  @keydown.esc.prevent="cancelAddItem"
                />
                <input
                  type="text"
                  inputmode="decimal"
                  :value="addInlineForm.monto"
                  placeholder="0.00"
                  class="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40"
                  data-testid="inline-monto-input"
                  @input="onDecimalInput($event, (v) => (addInlineForm.monto = v))"
                  @blur="addInlineForm.monto = formatMoneyDisplay(addInlineForm.monto)"
                  @keydown.enter.prevent="saveNewItem(cat.nombre)"
                  @keydown.esc.prevent="cancelAddItem"
                />
                <button
                  :disabled="isAdding"
                  class="h-9 px-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center shadow-sm"
                  style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);"
                  aria-label="Guardar ítem"
                  data-testid="inline-save-button"
                  @click.stop="saveNewItem(cat.nombre)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="h-9 px-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center"
                  aria-label="Cancelar"
                  data-testid="inline-cancel-button"
                  @click.stop="cancelAddItem"
                >
                  <X :size="14" />
                </button>
              </div>
              <p v-if="addInlineError" class="text-xs text-orange-600" data-testid="inline-error">
                {{ addInlineError }}
              </p>
            </div>

            <div v-else class="px-5 py-2.5 border-t border-slate-100">
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                data-testid="add-item-button"
                @click.stop="startAddItem(cat.nombre)"
              >
                <Plus :size="13" aria-hidden="true" />
                Agregar ítem
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppModal :open="isModalOpen" title="Nueva sección" accent-color="#F97316" @close="isModalOpen = false">
    <form data-testid="presupuesto-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label
            for="categoria-gasto"
            class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide"
          >
            Nombre de la sección
          </label>
          <input
            id="categoria-gasto"
            v-model="form.categoria"
            type="text"
            placeholder="Ej: Casa, Transporte, Salud..."
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/40 focus:bg-white transition-all"
            data-testid="categoria-input"
            @keydown.enter.prevent="handleSubmit"
          />
        </div>

        <p class="text-xs text-slate-500">
          Después de crear la sección podés agregar ítems directamente en la tarjeta.
        </p>

        <p
          v-if="formError"
          class="text-sm bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-3 py-2.5"
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          class="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-[0.98]"
          style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);"
          data-testid="submit-button"
        >
          Agregar sección
        </button>
      </div>
    </form>
  </AppModal>

  <ConfirmDialog
    :open="pendingDeleteGastoId !== null"
    @confirm="confirmDeleteGasto"
    @cancel="pendingDeleteGastoId = null"
  />

  <ConfirmDialog
    :open="pendingDeleteCategoria !== null"
    message="Esto eliminará la sección y todos sus ítems."
    @confirm="deleteCategoria(pendingDeleteCategoria!)"
    @cancel="pendingDeleteCategoria = null"
  />
</template>
