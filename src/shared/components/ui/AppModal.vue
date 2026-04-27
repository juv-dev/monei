<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  subtitle?: string
  accentColor?: string
}>()

defineEmits<{ close: [] }>()

let previousOverflow = ''

function lockScroll() {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  document.body.style.overflow = previousOverflow || ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) lockScroll()
    else unlockScroll()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unlockScroll()
})
</script>

<template>
  <div
    v-show="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    data-testid="app-modal"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="$emit('close')" />

    <!-- Panel -->
    <div
      class="relative bg-white w-full sm:rounded-3xl sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl rounded-t-3xl border border-slate-200/60 overflow-hidden"
    >
      <!-- Header (fijo) -->
      <div class="flex items-start justify-between px-6 pt-5 pb-4 bg-white border-b border-slate-100 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <span
            v-if="accentColor"
            class="w-1 h-8 rounded-full shrink-0"
            :style="{ background: accentColor }"
            aria-hidden="true"
          ></span>
          <div class="min-w-0">
            <h2 class="font-bold text-base text-slate-900 tracking-tight truncate">{{ title }}</h2>
            <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate">{{ subtitle }}</p>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors -mr-1"
          aria-label="Cerrar modal"
          @click="$emit('close')"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <!-- Content (scrolleable) -->
      <div class="flex-1 overflow-y-auto px-6 py-5 modal-scroll">
        <slot />
      </div>

      <!-- Footer (fijo, solo si hay slot) -->
      <div v-if="$slots.footer" class="shrink-0 px-6 py-3 bg-white border-t border-slate-100">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-scroll::-webkit-scrollbar {
  width: 6px;
}
.modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.modal-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}
.modal-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 116, 139, 0.55);
}
.modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}
</style>
