<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  accentColor?: string
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <!-- v-show keeps slot content (form inputs) in the DOM so tests can find them -->
  <div v-show="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" data-testid="app-modal">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="$emit('close')" />

    <!-- Panel -->
    <div class="relative bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl rounded-t-2xl">
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5] rounded-t-2xl"
        :style="accentColor ? { borderBottomColor: `${accentColor}22` } : {}"
      >
        <h2 class="font-bold text-[#1A1A2E]">{{ title }}</h2>
        <button
          type="button"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#1A1A2E] hover:bg-[#F0F2F5] transition-colors"
          aria-label="Cerrar modal"
          @click="$emit('close')"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <slot />
      </div>
    </div>
  </div>
</template>
