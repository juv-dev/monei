<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    open: boolean
    message?: string
  }>(),
  { message: 'Esta acción no se puede deshacer.' },
)

defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('cancel')" />
      <div class="relative bg-white rounded-2xl shadow-2xl border border-[#E5E0D5] p-5 max-w-xs w-full">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 :size="16" class="text-red-500" aria-hidden="true" />
          </div>
          <div>
            <p class="text-sm font-bold text-[#1C1B18]">¿Eliminar este registro?</p>
            <p class="text-xs text-[#9A9690] mt-0.5">{{ message }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2.5 text-sm font-semibold bg-[#F8F6F1] text-[#5A5854] rounded-xl hover:bg-[#EDE9E0] transition-colors"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 active:scale-95 transition-all"
            data-testid="confirm-dialog-confirm"
            @click="$emit('confirm')"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
