<script setup lang="ts">
import { CheckCircle2, AlertCircle, X } from 'lucide-vue-next'

defineProps<{
  toasts: Array<{ id: number; message: string; type: 'success' | 'error' }>
}>()

defineEmits<{ dismiss: [id: number] }>()
</script>

<template>
  <div class="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-white min-w-[260px] max-w-sm border"
        :style="toast.type === 'success' ? 'border-color: rgba(62,111,115,0.3)' : 'border-color: rgba(198,90,58,0.3)'"
        role="alert"
        data-testid="toast-notification"
      >
        <CheckCircle2
          v-if="toast.type === 'success'"
          :size="18"
          style="color: #3e6f73; flex-shrink: 0"
          aria-hidden="true"
        />
        <AlertCircle v-else :size="18" style="color: #c65a3a; flex-shrink: 0" aria-hidden="true" />
        <span class="flex-1 text-sm font-medium text-[#1A1A2E]">{{ toast.message }}</span>
        <button
          class="w-6 h-6 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#1A1A2E] transition-colors flex-shrink-0"
          :aria-label="`Cerrar notificación`"
          @click="$emit('dismiss', toast.id)"
        >
          <X :size="12" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
