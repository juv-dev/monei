<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  FileSpreadsheet,
  Download,
  Loader2,
  TrendingUp,
  ShoppingBag,
  Clock,
  CreditCard,
  DollarSign,
  Upload,
  CheckCircle,
  AlertCircle,
  FileCheck,
} from 'lucide-vue-next'
import { useQueryClient } from '@tanstack/vue-query'
import { useIngresos } from '~/modules/ingresos/composables/useIngresos'
import { usePresupuesto } from '~/modules/presupuesto/composables/usePresupuesto'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import { useAuthStore } from '~/stores/auth'
import { exportReporteToExcel } from '../services/exportService'
import { parseImportFile } from '../services/importService'
import type { ImportData } from '../services/importService'
import { ingresosApi } from '~/modules/ingresos/services/api'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import { tarjetasApi } from '~/modules/tarjetas/services/api'
import { deudasApi } from '~/modules/deudas/services/api'

const auth = useAuthStore()
const queryClient = useQueryClient()
const { ingresos, totalIngresos } = useIngresos()
const { gastos, totalGastado } = usePresupuesto()
const { deudas, totalDeudas } = useDeudas()
const { tarjetas, totalTarjetas } = useTarjetas()
const { rate: usdRate } = useExchangeRate()

const isExporting = ref(false)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}

const stats = computed(() => [
  { label: 'Ingresos', count: ingresos.value.length, total: totalIngresos.value, color: '#10B981', icon: TrendingUp },
  { label: 'Egresos', count: gastos.value.length, total: totalGastado.value, color: '#F97316', icon: ShoppingBag },
  { label: 'Préstamos', count: deudas.value.length, total: totalDeudas.value, color: '#F59E0B', icon: Clock },
  { label: 'Tarjetas', count: tarjetas.value.length, total: totalTarjetas.value, color: '#F43F5E', icon: CreditCard },
])

async function handleExport(): Promise<void> {
  if (isExporting.value) return
  isExporting.value = true
  try {
    await exportReporteToExcel({
      ingresos: ingresos.value,
      gastos: gastos.value,
      deudas: deudas.value,
      tarjetas: tarjetas.value,
      usdRate: usdRate.value,
      userDisplayName: auth.currentUser?.displayName,
    })
  } finally {
    isExporting.value = false
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

type ImportStep = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error'

interface SkippedCounts {
  ingresos: number
  gastos: number
  tarjetas: number
  deudas: number
}

const fileInputRef = ref<HTMLInputElement | null>(null)
const importStep = ref<ImportStep>('idle')
const importNewData = ref<ImportData | null>(null)
const skippedCounts = ref<SkippedCounts>({ ingresos: 0, gastos: 0, tarjetas: 0, deudas: 0 })
const importFileName = ref('')
const importError = ref('')

const importPreview = computed(() => [
  { label: 'Ingresos', newCount: importNewData.value?.ingresos.length ?? 0, skipped: skippedCounts.value.ingresos },
  { label: 'Egresos', newCount: importNewData.value?.gastos.length ?? 0, skipped: skippedCounts.value.gastos },
  { label: 'Tarjetas', newCount: importNewData.value?.tarjetas.length ?? 0, skipped: skippedCounts.value.tarjetas },
  { label: 'Préstamos', newCount: importNewData.value?.deudas.length ?? 0, skipped: skippedCounts.value.deudas },
])

const hasNewData = computed(() => {
  const d = importNewData.value
  if (!d) return false
  return d.ingresos.length + d.gastos.length + d.tarjetas.length + d.deudas.length > 0
})

async function handleFileChange(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  importFileName.value = file.name
  importStep.value = 'parsing'
  importNewData.value = null
  importError.value = ''
  skippedCounts.value = { ingresos: 0, gastos: 0, tarjetas: 0, deudas: 0 }

  try {
    const parsed = await parseImportFile(file)

    const userId = auth.userId
    const [existingIng, existingGas, existingTar, existingDeu] = await Promise.all([
      ingresosApi.getAll(userId),
      presupuestoApi.getAll(userId),
      tarjetasApi.getAll(userId),
      deudasApi.getAll(userId),
    ])

    const ingSet = new Set(existingIng.map((i) => `${i.descripcion}|${i.monto}`))
    const gasSet = new Set(existingGas.map((g) => `${g.categoria}|${g.descripcion}|${g.monto}`))
    const tarSet = new Set(existingTar.map((t) => t.descripcion.toLowerCase().trim()))
    const deuSet = new Set(
      existingDeu.map((d) => `${d.nombrePersona.toLowerCase().trim()}|${d.descripcion.toLowerCase().trim()}`),
    )

    const newIngresos = parsed.ingresos.filter((i) => !ingSet.has(`${i.descripcion}|${i.monto}`))
    const newGastos = parsed.gastos.filter((g) => !gasSet.has(`${g.categoria}|${g.descripcion}|${g.monto}`))
    const newTarjetas = parsed.tarjetas.filter((t) => !tarSet.has(t.descripcion.toLowerCase().trim()))
    const newDeudas = parsed.deudas.filter(
      (d) =>
        !deuSet.has(`${d.nombrePersona.toLowerCase().trim()}|${d.descripcion.toLowerCase().trim()}`),
    )

    skippedCounts.value = {
      ingresos: parsed.ingresos.length - newIngresos.length,
      gastos: parsed.gastos.length - newGastos.length,
      tarjetas: parsed.tarjetas.length - newTarjetas.length,
      deudas: parsed.deudas.length - newDeudas.length,
    }

    importNewData.value = {
      ingresos: newIngresos,
      gastos: newGastos,
      tarjetas: newTarjetas,
      deudas: newDeudas,
    }

    importStep.value = 'preview'
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Error al leer el archivo.'
    importStep.value = 'error'
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

async function confirmImport(): Promise<void> {
  if (!importNewData.value || !hasNewData.value) return
  importStep.value = 'importing'

  const userId = auth.userId
  const { ingresos: ing, gastos: gas, tarjetas: tar, deudas: deu } = importNewData.value

  try {
    await Promise.all(ing.map((i) => ingresosApi.create(userId, i)))
    await Promise.all(gas.map((g) => presupuestoApi.create(userId, g)))
    await Promise.all(tar.map((t) => tarjetasApi.create(userId, t)))
    await Promise.all(deu.map((d) => deudasApi.create(userId, d)))

    await queryClient.invalidateQueries({ queryKey: ['finance', userId] })

    importStep.value = 'success'
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Error al importar los datos.'
    importStep.value = 'error'
  }
}

function resetImport(): void {
  importStep.value = 'idle'
  importNewData.value = null
  importFileName.value = ''
  importError.value = ''
  skippedCounts.value = { ingresos: 0, gastos: 0, tarjetas: 0, deudas: 0 }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F6F1]" data-testid="reportes-view">
    <div class="max-w-3xl mx-auto p-5 lg:p-8 space-y-5">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">Reportes</h1>
        <p class="text-sm text-[#64748B] mt-0.5">Exportá e importá tu información financiera</p>
      </div>

      <!-- Resumen de datos -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-white rounded-2xl p-4 border border-[#E5E0D5] shadow-sm"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" :style="{ background: stat.color + '18' }">
              <component :is="stat.icon" :size="14" :style="{ color: stat.color }" />
            </div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-[#9A9690]">{{ stat.label }}</p>
          </div>
          <p class="text-xl font-black text-[#1C1B18] tabular-nums">{{ stat.count }}</p>
          <p class="text-[11px] text-[#9A9690] mt-0.5 tabular-nums">{{ formatCurrency(stat.total) }}</p>
        </div>
      </div>

      <!-- Export card -->
      <div class="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
        <div class="p-6 lg:p-8">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style="background: linear-gradient(135deg, #EBF5F5 0%, #D5EDED 100%);"
            >
              <FileSpreadsheet :size="22" style="color: #356E6B" />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-base font-bold text-[#1C1B18]">Excel completo</h2>
              <p class="text-sm text-[#9A9690] mt-1 leading-relaxed">
                Incluye resumen general, ingresos, egresos por categoría, tarjetas de crédito y una hoja por cada préstamo con su proyección.
              </p>
              <div class="flex flex-wrap gap-2 mt-3">
                <span
                  v-for="sheet in ['Resumen', 'Ingresos', 'Egresos', 'Tarjetas', 'Préstamos']"
                  :key="sheet"
                  class="text-[10px] font-semibold bg-[#F8F6F1] border border-[#E5E0D5] text-[#5A5854] rounded-full px-2.5 py-1"
                >
                  {{ sheet }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-2 pt-4 border-t border-[#F0EDE8]">
            <DollarSign :size="13" class="text-[#9A9690] shrink-0" />
            <p class="text-[11px] text-[#9A9690]">
              Tipo de cambio incluido: <span class="font-semibold text-[#5A5854]">USD 1 = S/ {{ usdRate.toFixed(3) }}</span>
            </p>
          </div>
        </div>

        <div class="px-6 pb-6 lg:px-8 lg:pb-8">
          <button
            type="button"
            :disabled="isExporting"
            class="flex items-center gap-2.5 px-6 py-3 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style="background: linear-gradient(135deg, #4D9B97 0%, #356E6B 100%);"
            data-testid="export-button"
            @click="handleExport"
          >
            <Loader2 v-if="isExporting" :size="16" class="animate-spin" />
            <Download v-else :size="16" />
            {{ isExporting ? 'Generando reporte...' : 'Descargar Excel' }}
          </button>
        </div>
      </div>

      <!-- Import card -->
      <div class="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden" data-testid="import-card">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          data-testid="import-file-input"
          @change="handleFileChange"
        />

        <div class="p-6 lg:p-8">
          <!-- idle -->
          <template v-if="importStep === 'idle'">
            <div class="flex items-start gap-4">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);"
              >
                <Upload :size="22" style="color: #4F46E5" />
              </div>
              <div class="flex-1 min-w-0">
                <h2 class="text-base font-bold text-[#1C1B18]">Importar desde Excel</h2>
                <p class="text-sm text-[#9A9690] mt-1 leading-relaxed">
                  Importá un reporte exportado desde Monei. Los registros que ya existen en tu cuenta se omiten automáticamente.
                </p>
              </div>
            </div>
          </template>

          <!-- parsing -->
          <template v-else-if="importStep === 'parsing'">
            <div class="flex items-center gap-3 py-1">
              <Loader2 :size="20" class="animate-spin text-[#9A9690] shrink-0" />
              <span class="text-sm text-[#64748B]">Analizando archivo y verificando duplicados...</span>
            </div>
          </template>

          <!-- error -->
          <template v-else-if="importStep === 'error'">
            <div class="flex items-start gap-3">
              <AlertCircle :size="20" class="text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-semibold text-[#1C1B18]">No se pudo procesar el archivo</p>
                <p class="text-sm text-[#9A9690] mt-0.5 leading-relaxed">{{ importError }}</p>
              </div>
            </div>
          </template>

          <!-- preview -->
          <template v-else-if="importStep === 'preview'">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#F0EFFF]">
                <FileCheck :size="18" style="color: #4F46E5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-[#1C1B18] truncate">{{ importFileName }}</p>
                <p class="text-[11px] text-[#9A9690]">
                  {{ hasNewData ? 'Revisá los datos nuevos antes de confirmar' : 'Todos los registros ya existen en tu cuenta' }}
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                v-for="item in importPreview"
                :key="item.label"
                class="bg-[#F8F6F1] rounded-xl p-3 border border-[#F0EDE8]"
              >
                <p class="text-xl font-black tabular-nums" :class="item.newCount > 0 ? 'text-[#1C1B18]' : 'text-[#C8C4BC]'">
                  {{ item.newCount }}
                </p>
                <p class="text-[11px] text-[#9A9690] mt-0.5">{{ item.label }}</p>
                <p v-if="item.skipped > 0" class="text-[10px] text-[#C8C4BC] mt-1">{{ item.skipped }} ya existen</p>
              </div>
            </div>
          </template>

          <!-- importing -->
          <template v-else-if="importStep === 'importing'">
            <div class="flex items-center gap-3 py-1">
              <Loader2 :size="20" class="animate-spin shrink-0" style="color: #4F46E5" />
              <span class="text-sm text-[#64748B]">Importando datos...</span>
            </div>
          </template>

          <!-- success -->
          <template v-else-if="importStep === 'success'">
            <div class="flex items-start gap-3">
              <CheckCircle :size="20" class="text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-semibold text-[#1C1B18]">¡Importación completada!</p>
                <p class="text-sm text-[#9A9690] mt-0.5">Todos los datos nuevos fueron cargados correctamente.</p>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer actions -->
        <div class="px-6 pb-6 lg:px-8 lg:pb-8">
          <button
            v-if="importStep === 'idle'"
            type="button"
            class="flex items-center gap-2.5 px-5 py-2.5 font-bold rounded-xl transition-all text-sm border border-[#C8C4BC] text-[#5A5854] hover:bg-[#F8F6F1] active:scale-95"
            data-testid="import-select-button"
            @click="fileInputRef?.click()"
          >
            <Upload :size="15" />
            Seleccionar archivo
          </button>

          <button
            v-else-if="importStep === 'error'"
            type="button"
            class="flex items-center gap-2.5 px-5 py-2.5 font-bold rounded-xl transition-all text-sm border border-[#C8C4BC] text-[#5A5854] hover:bg-[#F8F6F1] active:scale-95"
            @click="resetImport"
          >
            Intentar de nuevo
          </button>

          <div v-else-if="importStep === 'preview'" class="flex items-center gap-3">
            <button
              type="button"
              class="flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all text-sm border border-[#C8C4BC] text-[#5A5854] hover:bg-[#F8F6F1] active:scale-95"
              data-testid="import-cancel-button"
              @click="resetImport"
            >
              Cancelar
            </button>
            <button
              v-if="hasNewData"
              type="button"
              class="flex items-center gap-2.5 px-5 py-2.5 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 text-sm"
              style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);"
              data-testid="import-confirm-button"
              @click="confirmImport"
            >
              <Upload :size="15" />
              Importar datos
            </button>
          </div>

          <button
            v-else-if="importStep === 'success'"
            type="button"
            class="flex items-center gap-2.5 px-5 py-2.5 font-bold rounded-xl transition-all text-sm border border-[#C8C4BC] text-[#5A5854] hover:bg-[#F8F6F1] active:scale-95"
            @click="resetImport"
          >
            Importar otro archivo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
