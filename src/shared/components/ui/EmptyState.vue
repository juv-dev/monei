<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  color: string
  title: string
  subtitle: string
  testid?: string
  inline?: boolean
}>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center py-14 px-5 text-center"
    :class="inline ? '' : 'bg-white rounded-2xl border border-[#EEEEF0]'"
    :data-testid="testid"
  >
    <div
      class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
      :style="{ backgroundColor: color + '14' }"
    >
      <component :is="icon" :size="26" :style="{ color }" aria-hidden="true" />
    </div>
    <p class="text-sm font-semibold text-[#1A1A2E]">{{ title }}</p>
    <p class="text-xs text-[#94A3B8] mt-1 max-w-50">{{ subtitle }}</p>
  </div>
</template>
