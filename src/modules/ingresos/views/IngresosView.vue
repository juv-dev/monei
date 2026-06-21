<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  TrendingUp,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  Search,
} from 'lucide-vue-next'
import { useIngresos } from '../composables/useIngresos'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'
import AppModal from '~/shared/components/ui/AppModal.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput } from '~/shared/utils/format'
import { validateMonto, validateDescripcion, sanitize } from '~/shared/utils/validation'
import type { Ingreso } from '../types'

const route = useRoute()
const router = useRouter()

const {
  ingresos,
  isLoading,
  isError,
  totalIngresos,
  addIngreso,
  updateIngreso,
  removeIngreso,
  isAdding,
  isUpdating,
  isRemoving,
} = useIngresos()

const { startLoading, finishLoading, showToast } = useAppFeedback()
const { monthLabel, isCurrentMonth, prevMonth, nextMonth } = useSelectedMonth()

const form = reactive({ monto: '', descripcion: '' })
const formError = ref<string | null>(null)
const isModalOpen = ref(false)

const editingId = ref<string | null>(null)
const editForm = reactive({ monto: '', descripcion: '' })

const egSearch = ref('')
const egSort = ref<'monto' | 'nombre'>('monto')

const EG_COLORS: string[] = [
  '#1E9E6A',
  '#2A7E76',
  '#4C9A6E',
  '#5B9E7A',
  '#3FB98C',
  '#2A9D8F',
  '#5B6FB8',
  '#7A6CCB',
]

const avgIngreso = computed(() =>
  ingresos.value.length ? totalIngresos.value / ingresos.value.length : 0,
)

const topIngreso = computed((): Ingreso | null => {
  if (!ingresos.value.length) return null
  return ingresos.value.reduce((top, cur) => (cur.monto > top.monto ? cur : top))
})

const filteredSorted = computed((): Ingreso[] => {
  const q = egSearch.value.trim().toLowerCase()
  let list = ingresos.value
  if (q) list = list.filter((i) => i.descripcion.toLowerCase().includes(q))
  if (egSort.value === 'nombre') {
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  }
  return [...list].sort((a, b) => b.monto - a.monto)
})

function pctOfTotal(monto: number): string {
  if (!totalIngresos.value) return '0%'
  return Math.round((monto / totalIngresos.value) * 100) + '%'
}

function avatarLetter(text: string): string {
  return (text.trim().charAt(0) || '·').toUpperCase()
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

function openModal(): void {
  formError.value = null
  isModalOpen.value = true
}

function startEdit(ingreso: Ingreso): void {
  editingId.value = ingreso.id
  editForm.descripcion = ingreso.descripcion
  editForm.monto = String(ingreso.monto)
}

function cancelEdit(): void {
  editingId.value = null
}

function saveEdit(id: string): void {
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

  startLoading('#1E9E6A')
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

onMounted(() => {
  if (route.query.nuevo === '1') {
    openModal()
    const { nuevo: _nuevo, ...rest } = route.query
    void router.replace({ query: rest })
  }
})
</script>

<template>
  <div
    class="min-h-screen"
    style="background: #f1ece1; font-family: 'Manrope', system-ui, sans-serif; color: #1c1a15"
    data-testid="ingresos-view"
  >
    <div class="mx-auto w-full max-w-[460px] px-[18px] pb-28 pt-6">
      <div class="mb-[15px] flex items-start justify-between">
        <div>
          <p class="m-0" style="font-size: 25px; font-weight: 800; letter-spacing: -0.025em">
            Ingresos
          </p>
          <p class="m-0" style="font-size: 12px; color: #9a9384; font-weight: 500; margin-top: 3px">
            Organizá tu plata por fuente
          </p>
        </div>
        <button
          type="button"
          class="flex items-center border-none text-white"
          style="
            background: linear-gradient(135deg, #3fb98c, #1e9e6a);
            box-shadow: 0 6px 14px -4px rgba(30, 158, 106, 0.5);
            border-radius: 999px;
            padding: 9px 13px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            gap: 6px;
            cursor: pointer;
          "
          data-testid="open-modal-button"
          @click="openModal"
        >
          <Plus :size="14" aria-hidden="true" />
          Nueva fuente
        </button>
      </div>

      <div
        class="flex items-center justify-between"
        style="
          background: #fff;
          border: 1px solid #e7e0d2;
          border-radius: 13px;
          padding: 7px 8px;
          margin-bottom: 13px;
        "
      >
        <button
          type="button"
          class="flex items-center justify-center border-none"
          style="
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: #f4efe5;
            cursor: pointer;
          "
          aria-label="Mes anterior"
          @click="prevMonth"
        >
          <ChevronLeft :size="14" style="color: #8a8273" />
        </button>
        <p class="capitalize m-0" style="font-size: 13px; font-weight: 700">{{ monthLabel }}</p>
        <button
          type="button"
          class="flex items-center justify-center border-none disabled:opacity-40"
          style="
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: #f4efe5;
            cursor: pointer;
          "
          :disabled="isCurrentMonth"
          aria-label="Mes siguiente"
          @click="nextMonth"
        >
          <ChevronRight :size="14" style="color: #8a8273" />
        </button>
      </div>

      <div
        class="grid"
        style="grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 13px"
        data-testid="summary-card"
      >
        <div
          style="
            background: linear-gradient(135deg, #e3f4ec, #cfebdd);
            border: 1px solid rgba(30, 158, 106, 0.18);
            border-radius: 16px;
            padding: 13px;
          "
        >
          <div class="flex items-center" style="gap: 7px; margin-bottom: 7px">
            <div
              class="flex items-center justify-center"
              style="
                width: 24px;
                height: 24px;
                border-radius: 7px;
                background: rgba(30, 158, 106, 0.16);
              "
            >
              <TrendingUp :size="13" style="color: #1e9e6a" aria-hidden="true" />
            </div>
            <span
              style="
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                color: #1a8059;
                letter-spacing: 0.05em;
              "
            >
              Total
            </span>
          </div>
          <p
            class="m-0"
            style="
              font-family: 'Space Grotesk', sans-serif;
              font-size: 20px;
              font-weight: 600;
              letter-spacing: -0.02em;
            "
            data-testid="total-ingresos"
          >
            {{ formatCurrency(totalIngresos) }}
          </p>
        </div>

        <div
          style="
            background: #fff;
            border: 1px solid #e7e0d2;
            border-radius: 16px;
            padding: 13px;
            box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05);
          "
        >
          <p
            class="m-0"
            style="
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9a9384;
              letter-spacing: 0.05em;
            "
          >
            Fuentes
          </p>
          <p
            class="m-0"
            style="
              font-family: 'Space Grotesk', sans-serif;
              font-size: 20px;
              font-weight: 600;
              margin-top: 7px;
            "
          >
            {{ ingresos.length }}
          </p>
        </div>

        <div
          style="
            background: #fff;
            border: 1px solid #e7e0d2;
            border-radius: 16px;
            padding: 13px;
            box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05);
          "
        >
          <p
            class="m-0"
            style="
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9a9384;
              letter-spacing: 0.05em;
            "
          >
            Mayor fuente
          </p>
          <p
            class="m-0"
            style="font-size: 14px; font-weight: 800; margin-top: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >
            {{ topIngreso ? topIngreso.descripcion : '—' }}
          </p>
          <p
            v-if="topIngreso"
            class="m-0"
            style="
              font-family: 'Space Grotesk', sans-serif;
              font-size: 12px;
              font-weight: 600;
              color: #9a9384;
              margin-top: 2px;
            "
          >
            {{ formatCurrency(topIngreso.monto) }}
          </p>
        </div>

        <div
          style="
            background: #fff;
            border: 1px solid #e7e0d2;
            border-radius: 16px;
            padding: 13px;
            box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05);
          "
        >
          <p
            class="m-0"
            style="
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9a9384;
              letter-spacing: 0.05em;
            "
          >
            Promedio
          </p>
          <p
            class="m-0"
            style="
              font-family: 'Space Grotesk', sans-serif;
              font-size: 20px;
              font-weight: 600;
              margin-top: 7px;
            "
          >
            {{ ingresos.length ? formatCurrency(avgIngreso) : '—' }}
          </p>
        </div>
      </div>

      <div class="flex" style="gap: 9px; margin-bottom: 13px">
        <div class="flex-1" style="position: relative">
          <Search
            :size="15"
            style="
              position: absolute;
              left: 12px;
              top: 50%;
              transform: translateY(-50%);
              color: #a39a88;
              pointer-events: none;
            "
            aria-hidden="true"
          />
          <input
            v-model="egSearch"
            type="text"
            placeholder="Buscar ingreso..."
            style="
              width: 100%;
              box-sizing: border-box;
              border: 1px solid #e7e0d2;
              background: #fff;
              border-radius: 13px;
              padding: 11px 12px 11px 36px;
              font-size: 13px;
              color: #1c1a15;
              outline: none;
            "
          />
        </div>
        <button
          type="button"
          class="flex items-center border-none"
          style="
            gap: 6px;
            border: 1px solid #e7e0d2;
            background: #fff;
            border-radius: 13px;
            padding: 0 13px;
            font-size: 12px;
            font-weight: 700;
            color: #5a5448;
            cursor: pointer;
            white-space: nowrap;
          "
          @click="egSort = egSort === 'monto' ? 'nombre' : 'monto'"
        >
          <ArrowUpDown :size="13" style="color: #5a5448" aria-hidden="true" />
          {{ egSort === 'monto' ? 'Monto' : 'Nombre' }}
        </button>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center"
        style="gap: 12px; padding: 64px 0; color: #9a9384"
        data-testid="loading-state"
      >
        <Loader2 :size="22" class="animate-spin" aria-hidden="true" />
        <span style="font-size: 13px; font-weight: 500">Cargando...</span>
      </div>

      <div
        v-else-if="isError"
        style="text-align: center; font-size: 13px; padding: 48px 0; color: #c25a4e"
        data-testid="error-state"
      >
        Error al cargar los ingresos
      </div>

      <div
        v-else-if="ingresos.length === 0"
        style="
          background: #fff;
          border: 1px solid #e7e0d2;
          border-radius: 22px;
          padding: 40px 24px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05);
        "
        data-testid="empty-state"
      >
        <div
          class="flex items-center justify-center"
          style="
            width: 54px;
            height: 54px;
            border-radius: 16px;
            background: #e3f4ec;
            margin: 0 auto 14px;
          "
        >
          <TrendingUp :size="24" style="color: #1e9e6a" aria-hidden="true" />
        </div>
        <p class="m-0" style="font-size: 15px; font-weight: 800">
          No hay ingresos registrados
        </p>
        <p class="m-0" style="font-size: 12px; color: #9a9384; margin: 5px 0 16px">
          Agregá tu primera fuente de ingreso este mes
        </p>
        <button
          type="button"
          class="border-none text-white"
          style="
            background: linear-gradient(135deg, #3fb98c, #1e9e6a);
            border-radius: 999px;
            padding: 11px 20px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          "
          @click="openModal"
        >
          Nueva fuente
        </button>
      </div>

      <div v-else data-testid="ingresos-list">
        <div
          v-for="(ingreso, idx) in filteredSorted"
          :key="ingreso.id"
          class="group"
          style="
            background: #fff;
            border: 1px solid #e7e0d2;
            border-radius: 18px;
            margin-bottom: 11px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(28, 26, 21, 0.05);
          "
          data-testid="ingreso-item"
        >
          <div
            v-if="editingId !== ingreso.id"
            class="flex items-center"
            style="gap: 11px; padding: 13px 14px 11px"
          >
            <div
              class="flex items-center justify-center shrink-0"
              style="
                width: 36px;
                height: 36px;
                border-radius: 11px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 15px;
                font-weight: 600;
              "
              :style="{
                background: EG_COLORS[idx % EG_COLORS.length] + '22',
                color: EG_COLORS[idx % EG_COLORS.length],
              }"
              aria-hidden="true"
            >
              {{ avatarLetter(ingreso.descripcion) }}
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="m-0"
                style="
                  font-size: 14px;
                  font-weight: 700;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                "
                data-testid="ingreso-descripcion"
              >
                {{ ingreso.descripcion }}
              </p>
              <p class="m-0" style="font-size: 11px; color: #9a9384; font-weight: 500; margin-top: 2px">
                {{ pctOfTotal(ingreso.monto) }} del total
              </p>
            </div>

            <span
              class="shrink-0"
              style="
                font-family: 'Space Grotesk', sans-serif;
                font-size: 15px;
                font-weight: 600;
                color: #1e9e6a;
              "
              data-testid="ingreso-monto"
            >
              {{ formatCurrency(ingreso.monto) }}
            </span>

            <button
              type="button"
              class="flex items-center justify-center border-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              style="background: none; cursor: pointer; padding: 4px"
              :aria-label="`Editar ingreso ${ingreso.descripcion}`"
              data-testid="edit-button"
              @click="startEdit(ingreso)"
            >
              <Pencil :size="13" style="color: #a39a88" />
            </button>

            <button
              type="button"
              class="flex items-center justify-center border-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              style="background: none; cursor: pointer; padding: 4px"
              :disabled="isRemoving"
              :aria-label="`Eliminar ingreso ${ingreso.descripcion}`"
              data-testid="delete-button"
              @click="handleDelete(ingreso.id)"
            >
              <Trash2 :size="14" style="color: #c9b9a0" />
            </button>
          </div>

          <div
            v-if="editingId !== ingreso.id"
            style="height: 5px; background: #f4efe5; margin: 0 14px 12px; border-radius: 999px; overflow: hidden"
          >
            <div
              style="height: 100%; border-radius: 999px"
              :style="{
                width: pctOfTotal(ingreso.monto),
                background: EG_COLORS[idx % EG_COLORS.length],
              }"
            />
          </div>

          <div
            v-else
            class="flex items-center"
            style="gap: 8px; padding: 12px 14px"
          >
            <input
              v-model="editForm.descripcion"
              type="text"
              placeholder="Descripción"
              class="flex-1 min-w-0"
              style="
                border: 1px solid #e7e0d2;
                background: #f8f5ef;
                border-radius: 11px;
                padding: 8px 12px;
                font-size: 13px;
                outline: none;
                color: #1c1a15;
              "
              data-testid="edit-descripcion-input"
              @keydown.enter.prevent="saveEdit(ingreso.id)"
              @keydown.esc.prevent="cancelEdit"
            />
            <input
              type="text"
              inputmode="decimal"
              :value="editForm.monto"
              placeholder="0.00"
              style="
                width: 96px;
                border: 1px solid #e7e0d2;
                background: #f8f5ef;
                border-radius: 11px;
                padding: 8px 12px;
                font-size: 13px;
                outline: none;
                color: #1c1a15;
              "
              data-testid="edit-monto-input"
              @input="onDecimalInput($event, (v) => (editForm.monto = v))"
              @blur="editForm.monto = formatMoneyDisplay(editForm.monto)"
              @keydown.enter.prevent="saveEdit(ingreso.id)"
              @keydown.esc.prevent="cancelEdit"
            />
            <button
              type="button"
              :disabled="isUpdating"
              class="flex items-center justify-center border-none text-white shrink-0"
              style="
                width: 34px;
                height: 34px;
                border-radius: 10px;
                background: #1e9e6a;
                cursor: pointer;
              "
              aria-label="Guardar cambios"
              data-testid="save-edit-button"
              @click="saveEdit(ingreso.id)"
            >
              <Check :size="13" />
            </button>
            <button
              type="button"
              class="flex items-center justify-center border-none shrink-0"
              style="
                width: 34px;
                height: 34px;
                border-radius: 10px;
                background: #f0ebe0;
                color: #6e6757;
                cursor: pointer;
              "
              aria-label="Cancelar edición"
              data-testid="cancel-edit-button"
              @click="cancelEdit"
            >
              <X :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppModal
    :open="isModalOpen"
    title="Agregar Ingreso"
    accent-color="#1E9E6A"
    @close="isModalOpen = false"
  >
    <form data-testid="ingresos-form" novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div>
          <label
            for="descripcion-ingreso"
            style="
              display: block;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9a9384;
              letter-spacing: 0.05em;
              margin: 0 0 8px;
            "
          >
            Descripción del ingreso
          </label>
          <input
            id="descripcion-ingreso"
            v-model="form.descripcion"
            type="text"
            placeholder="Ej: Sueldo, Proyecto, Bono..."
            style="
              width: 100%;
              box-sizing: border-box;
              border: 1px solid #e7e0d2;
              background: #fbf9f4;
              border-radius: 14px;
              padding: 14px;
              font-size: 15px;
              outline: none;
              color: #1c1a15;
            "
            data-testid="descripcion-input"
          />
        </div>

        <div>
          <label
            for="monto-ingreso"
            style="
              display: block;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9a9384;
              letter-spacing: 0.05em;
              margin: 0 0 8px;
            "
          >
            Monto (S/)
          </label>
          <input
            id="monto-ingreso"
            type="text"
            inputmode="decimal"
            :value="form.monto"
            placeholder="0.00"
            style="
              width: 100%;
              box-sizing: border-box;
              border: 1px solid #e7e0d2;
              background: #fbf9f4;
              border-radius: 14px;
              padding: 14px;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 16px;
              font-weight: 600;
              outline: none;
              color: #1c1a15;
            "
            data-testid="monto-input"
            @input="onDecimalInput($event, (v) => (form.monto = v))"
            @blur="form.monto = formatMoneyDisplay(form.monto)"
          />
        </div>

        <p
          v-if="formError"
          style="
            background: #fbedeb;
            border: 1px solid rgba(194, 90, 78, 0.2);
            color: #c25a4e;
            border-radius: 11px;
            padding: 10px 12px;
            font-size: 13px;
            margin: 0;
          "
          role="alert"
          data-testid="form-error"
        >
          {{ formError }}
        </p>

        <button
          type="submit"
          :disabled="isAdding"
          class="border-none text-white"
          style="
            width: 100%;
            background: linear-gradient(135deg, #3fb98c, #1e9e6a);
            border-radius: 15px;
            padding: 15px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 18px -6px rgba(30, 158, 106, 0.5);
          "
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
