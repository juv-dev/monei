<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  color: string
  title: string
  subtitle: string
  testid?: string
  inline?: boolean
  actionLabel?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center py-14 px-5 text-center"
    :class="inline ? '' : 'bg-white rounded-2xl border border-[#E5E0D5] shadow-[0_1px_3px_rgba(28,27,24,0.04),0_4px_16px_rgba(28,27,24,0.05)]'"
    :data-testid="testid"
  >
    <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" :style="{ backgroundColor: color + '18' }">
      <component :is="icon" :size="26" :style="{ color }" aria-hidden="true" />
    </div>
    <p class="text-sm font-semibold text-[#1C1B18]">{{ title }}</p>
    <p class="text-xs text-[#9A9690] mt-1 max-w-[200px] leading-relaxed">{{ subtitle }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="mt-4 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      :style="{ backgroundColor: color }"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
