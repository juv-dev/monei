<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ShoppingBag, ChevronDown, ChevronUp, Trash2, Inbox, Plus, GripVertical, Pencil, Check, X } from 'lucide-vue-next'
import { usePresupuesto } from '../composables/usePresupuesto'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { useAuthStore } from '~/stores/auth'
import AppModal from '~/shared/components/ui/AppModal.vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'
import PageHeader from '~/shared/components/layout/PageHeader.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
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
  return allNames.map((nombre) => porCategoria.value.find((c) => c.nombre === nombre) ?? { nombre, items: [], subtotal: 0 })
})

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

function deleteCategoria(nombre: string) {
  const cat = porCategoria.value.find((c) => c.nombre === nombre)
  cat?.items.forEach((g) => removeGasto(g.id))
  categoryOrder.value = categoryOrder.value.filter((n) => n !== nombre)
  localStorage.setItem(orderKey.value, JSON.stringify(categoryOrder.value))
  categoriasExpandidas.value.delete(nombre)
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
  if (!addInlineForm.descripcion.trim()) {
    addInlineError.value = 'La descripción es requerida'
    return
  }
  if (isNaN(monto) || monto <= 0) {
    addInlineError.value = 'El monto debe ser un número positivo'
    return
  }
  startLoading('#C65A3A')
  addGasto({ monto, descripcion: addInlineForm.descripcion.trim(), categoria: categoriaNombre })
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
    showToast('Item agregado correctamente')
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
  removeGasto(id)
}
</script>

<template>
  <div class="min-h-screen bg-[#F0F2F5]" data-testid="presupuesto-view">
    <div class="max-w-5xl mx-auto p-5 lg:p-8 space-y-5">

      <PageHeader
        title="Presupuesto"
        subtitle="Organiza tus gastos por secciones"
        button-label="Nueva sección"
        button-color="#C65A3A"
        button-testid="open-modal-button"
        @action="openModal"
      />

      <div
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #C65A3A 0%, #9A3D27 100%)"
        data-testid="summary-card"
      >
        <div class="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-[0.08]" style="background: white"></div>
        <div class="absolute -bottom-14 -left-6 w-52 h-52 rounded-full opacity-[0.05]" style="background: white"></div>

        <div class="relative z-10 flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Total Gastado</p>
            <p class="text-4xl lg:text-5xl font-black text-white tracking-tight" data-testid="total-gastado">
              {{ formatCurrency(totalGastado) }}
            </p>
            <div class="flex gap-5 mt-5 pt-5 border-t border-white/20">
              <div>
                <p class="text-white/50 text-xs mb-0.5">Secciones</p>
                <p class="text-white font-bold">{{ porCategoria.length }}</p>
              </div>
              <div>
                <p class="text-white/50 text-xs mb-0.5">Mayor sección</p>
                <p class="text-white font-bold text-sm">
                  {{ porCategoria.length ? formatCurrency(Math.max(...porCategoria.map((c) => c.subtotal))) : '—' }}
                </p>
              </div>
            </div>
          </div>
          <div class="shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
            <ShoppingBag :size="30" class="text-white" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div v-if="isLoading" class="text-center py-16 text-[#94A3B8]" data-testid="loading-state">
          Cargando...
        </div>

        <div v-else-if="isError" class="text-center py-16 text-sm" style="color: #C65A3A" data-testid="error-state">
          Error al cargar los gastos
        </div>

        <EmptyState
          v-else-if="sortedPorCategoria.length === 0"
          :icon="Inbox"
          color="#C65A3A"
          title="No hay gastos registrados"
          subtitle="Define una sección y agrega tu primer gasto"
          testid="empty-state"
        />

        <div
          v-for="cat in sortedPorCategoria"
          :key="cat.nombre"
          draggable="true"
          class="bg-white rounded-2xl border border-[#EEEEF0] shadow-sm overflow-hidden transition-all select-none"
          :class="{
            'opacity-40 scale-[0.98]': draggingNombre === cat.nombre,
            'ring-2 ring-[#C65A3A]/40 scale-[1.005]': dragOverNombre === cat.nombre && draggingNombre !== cat.nombre,
          }"
          data-testid="categoria-grupo"
          @dragstart="onDragStart($event, cat.nombre)"
          @dragover="onDragOver($event, cat.nombre)"
          @drop="onDrop($event, cat.nombre)"
          @dragend="onDragEnd"
        >
          <div class="flex items-stretch">
            <div
              class="flex items-center px-2.5 text-[#CBD5E1] hover:text-[#94A3B8] cursor-grab active:cursor-grabbing transition-colors"
              aria-hidden="true"
            >
              <GripVertical :size="15" />
            </div>

            <button
              type="button"
              class="flex-1 flex items-center justify-between p-4 hover:bg-[#F8F9FB] transition-colors text-left group/header"
              :aria-expanded="String(categoriasExpandidas.has(cat.nombre))"
              data-testid="categoria-header"
              @click="editingCategoria !== cat.nombre && toggleCategoria(cat.nombre)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                  style="background: rgba(198,90,58,0.10); color: #C65A3A"
                  aria-hidden="true"
                >
                  {{ cat.nombre.charAt(0).toUpperCase() }}
                </div>

                <template v-if="editingCategoria === cat.nombre">
                  <input
                    v-model="editCategoriaNombre"
                    class="text-sm font-bold text-[#1A1A2E] border border-[#B6A77A] rounded-md px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-[#B6A77A]"
                    data-testid="edit-categoria-input"
                    @click.stop
                    @keydown.enter.stop="saveEditCategoria(cat.nombre)"
                    @keydown.escape.stop="cancelEditCategoria"
                  />
                  <button
                    class="w-6 h-6 rounded-md flex items-center justify-center text-[#3E6F73] hover:bg-[#3E6F73]/10 transition-all"
                    aria-label="Guardar nombre"
                    data-testid="save-categoria-button"
                    @click.stop="saveEditCategoria(cat.nombre)"
                  >
                    <Check :size="13" />
                  </button>
                  <button
                    class="w-6 h-6 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F0F2F5] transition-all"
                    aria-label="Cancelar edición"
                    data-testid="cancel-categoria-button"
                    @click.stop="cancelEditCategoria"
                  >
                    <X :size="13" />
                  </button>
                </template>

                <template v-else>
                  <span class="font-bold text-[#1A1A2E]" data-testid="categoria-nombre">{{ cat.nombre }}</span>
                  <button
                    class="opacity-0 group-hover/header:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#1A1A2E] hover:bg-[#F0F2F5] transition-all"
                    :aria-label="`Editar nombre de ${cat.nombre}`"
                    data-testid="edit-categoria-button"
                    @click.stop="startEditCategoria(cat.nombre)"
                  >
                    <Pencil :size="12" />
                  </button>
                </template>

                <span class="text-xs bg-[#F0F2F5] text-[#64748B] px-2 py-0.5 rounded-full font-semibold">
                  {{ cat.items.length }} ítem{{ cat.items.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-black text-sm" style="color: #C65A3A" data-testid="categoria-subtotal">
                  {{ formatCurrency(cat.subtotal) }}
                </span>
                <button
                  class="opacity-0 group-hover/header:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-all"
                  :aria-label="`Eliminar sección ${cat.nombre}`"
                  data-testid="delete-categoria-button"
                  @click.stop="deleteCategoria(cat.nombre)"
                >
                  <Trash2 :size="12" />
                </button>
                <component
                  :is="categoriasExpandidas.has(cat.nombre) ? ChevronUp : ChevronDown"
                  :size="16"
                  class="text-[#94A3B8]"
                  aria-hidden="true"
                />
              </div>
            </button>
          </div>

          <div v-if="categoriasExpandidas.has(cat.nombre)" class="border-t border-[#F0F2F5]">
            <div data-testid="gastos-list" class="divide-y divide-[#F0F2F5]">
              <div
                v-for="gasto in cat.items"
                :key="gasto.id"
                class="hover:bg-[#F8F9FB] transition-colors group"
                data-testid="gasto-item"
              >
                <div
                  v-if="editingId !== gasto.id"
                  class="flex items-center justify-between px-5 py-3"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-1.5 h-1.5 rounded-full shrink-0" style="background: rgba(198,90,58,0.4)" aria-hidden="true"></div>
                    <span class="text-sm text-[#1A1A2E] truncate" data-testid="gasto-descripcion">{{ gasto.descripcion }}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <span class="text-sm font-bold tabular-nums" style="color: #C65A3A" data-testid="gasto-monto">
                      {{ formatCurrency(gasto.monto) }}
                    </span>
                    <button
                      class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#3E6F73] hover:bg-[#3E6F73]/8 transition-all"
                      :aria-label="`Editar ${gasto.descripcion}`"
                      data-testid="edit-button"
                      @click.stop="startEdit(gasto)"
                    >
                      <Pencil :size="13" />
                    </button>
                    <button
                      class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#C65A3A] hover:bg-[#C65A3A]/8 transition-all"
                      :aria-label="`Eliminar ${gasto.descripcion}`"
                      data-testid="delete-button"
                      @click.stop="handleDelete(gasto.id)"
                    >
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </div>

                <div
                  v-else
                  class="px-5 py-3 space-y-2"
                >
                  <div class="flex gap-2">
                    <input
                      v-model="editForm.descripcion"
                      type="text"
                      placeholder="Descripción"
                      class="flex-1 px-3 py-1.5 border border-[#EEEEF0] rounded-lg text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30"
                      data-testid="edit-descripcion-input"
                      @keydown.enter.prevent="saveEdit(gasto.id)"
                      @keydown.esc.prevent="cancelEdit"
                    />
                    <input
                      type="text"
                      inputmode="decimal"
                      :value="editForm.monto"
                      placeholder="0.00"
                      class="w-24 px-3 py-1.5 border border-[#EEEEF0] rounded-lg text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30"
                      data-testid="edit-monto-input"
                      @input="onDecimalInput($event, v => editForm.monto = v)"
                      @blur="editForm.monto = formatMoneyDisplay(editForm.monto)"
                      @keydown.enter.prevent="saveEdit(gasto.id)"
                      @keydown.esc.prevent="cancelEdit"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="editForm.categoria"
                      type="text"
                      placeholder="Sección"
                      class="flex-1 px-3 py-1.5 border border-[#EEEEF0] rounded-lg text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30"
                      data-testid="edit-categoria-input"
                      @keydown.enter.prevent="saveEdit(gasto.id)"
                      @keydown.esc.prevent="cancelEdit"
                    />
                    <button
                      :disabled="isUpdating"
                      class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#3E6F73]/10 text-[#3E6F73] hover:bg-[#3E6F73]/20 disabled:opacity-50 transition-colors"
                      aria-label="Guardar cambios"
                      data-testid="save-edit-button"
                      @click.stop="saveEdit(gasto.id)"
                    >
                      <Check :size="14" />
                    </button>
                    <button
                      class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F2F5] text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
                      aria-label="Cancelar edición"
                      data-testid="cancel-edit-button"
                      @click.stop="cancelEdit"
                    >
                      <X :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="cat.items.length === 0 && addingToCategoria !== cat.nombre"
              class="px-5 py-5 flex items-center justify-center gap-2 text-[#94A3B8] text-sm"
              data-testid="categoria-empty-state"
            >
              <Inbox :size="15" aria-hidden="true" />
              Sin ítems todavía
            </div>

            <div
              v-if="addingToCategoria === cat.nombre"
              class="px-5 py-3 space-y-2 border-t border-[#F0F2F5] bg-[#FAFAF9]"
              data-testid="inline-add-form"
            >
              <div class="flex gap-2">
                <input
                  v-model="addInlineForm.descripcion"
                  type="text"
                  placeholder="Descripción del gasto"
                  class="flex-1 px-3 py-2 border border-[#EEEEF0] rounded-xl text-sm bg-white text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30"
                  data-testid="inline-descripcion-input"
                  @keydown.enter.prevent="saveNewItem(cat.nombre)"
                  @keydown.esc.prevent="cancelAddItem"
                />
                <input
                  type="text"
                  inputmode="decimal"
                  :value="addInlineForm.monto"
                  placeholder="0.00"
                  class="w-28 px-3 py-2 border border-[#EEEEF0] rounded-xl text-sm bg-white text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30"
                  data-testid="inline-monto-input"
                  @input="onDecimalInput($event, v => addInlineForm.monto = v)"
                  @blur="addInlineForm.monto = formatMoneyDisplay(addInlineForm.monto)"
                  @keydown.enter.prevent="saveNewItem(cat.nombre)"
                  @keydown.esc.prevent="cancelAddItem"
                />
                <button
                  :disabled="isAdding"
                  class="h-9 px-3 rounded-xl bg-[#C65A3A] text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center"
                  aria-label="Guardar ítem"
                  data-testid="inline-save-button"
                  @click.stop="saveNewItem(cat.nombre)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="h-9 px-3 rounded-xl bg-[#F0F2F5] text-[#64748B] hover:bg-[#E2E8F0] transition-all flex items-center"
                  aria-label="Cancelar"
                  data-testid="inline-cancel-button"
                  @click.stop="cancelAddItem"
                >
                  <X :size="14" />
                </button>
              </div>
              <p
                v-if="addInlineError"
                class="text-xs"
                style="color: #C65A3A"
                data-testid="inline-error"
              >
                {{ addInlineError }}
              </p>
            </div>

            <div
              v-else
              class="px-5 py-2.5 border-t border-[#F0F2F5]"
            >
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                style="color: #C65A3A"
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

  <AppModal
    :open="isModalOpen"
    title="Nueva Sección"
    accent-color="#C65A3A"
    @close="isModalOpen = false"
  >
    <form data-testid="presupuesto-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label for="categoria-gasto" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
            Nombre de la sección
          </label>
          <input
            id="categoria-gasto"
            v-model="form.categoria"
            type="text"
            placeholder="Ej: Trabajo, Casa, Salud..."
            class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#C65A3A]/30 focus:border-transparent focus:bg-white transition-all"
            data-testid="categoria-input"
            @keydown.enter.prevent="handleSubmit"
          />
        </div>

        <p class="text-xs text-[#94A3B8]">
          Después de crear la sección podrás agregar ítems directamente en la tarjeta.
        </p>

        <p
          v-if="formError"
          class="text-sm bg-[#C65A3A]/8 border border-[#C65A3A]/20 rounded-xl px-3 py-2.5"
          style="color: #C65A3A"
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          class="w-full py-3 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95"
          style="background: linear-gradient(135deg, #C65A3A 0%, #9A3D27 100%)"
          data-testid="submit-button"
        >
          + Agregar sección
        </button>
      </div>
    </form>
  </AppModal>
</template>
