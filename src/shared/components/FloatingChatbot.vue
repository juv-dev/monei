<script setup lang="ts">
import { ref } from 'vue'
import { X, Sparkles } from 'lucide-vue-next'
import FloatingChatPanel from '~/shared/components/FloatingChatPanel.vue'

const isOpen = ref(false)
</script>

<template>
  <!-- Panel -->
  <Transition name="panel">
    <div
      v-if="isOpen"
      class="fixed bottom-20 right-4 lg:bottom-20 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[70vh] flex flex-col bg-[#F5F6FA] rounded-2xl shadow-2xl border border-[#EEEEF0] overflow-hidden"
    >
      <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-[#EEEEF0] rounded-t-2xl">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9)">
            <Sparkles :size="14" class="text-white" />
          </div>
          <span class="text-sm font-bold text-[#1A1A2E]">MoneiAI</span>
          <span class="text-[10px] font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <button
          class="w-7 h-7 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#1A1A2E] hover:bg-[#F5F6FA] transition-all"
          @click="isOpen = false"
        >
          <X :size="16" />
        </button>
      </div>

      <div class="flex-1 min-h-0">
        <FloatingChatPanel />
      </div>
    </div>
  </Transition>

  <!-- Floating button -->
  <button
    v-if="!isOpen"
    class="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
    style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
    aria-label="Abrir asistente MoneiAI"
    @click="isOpen = true"
  >
    <Sparkles :size="24" class="text-white" />
  </button>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>
