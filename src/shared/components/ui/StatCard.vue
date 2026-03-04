<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string
  icon: Component
  color: string
  iconBg: string
  testid?: string
  valueTestid?: string
  borderColor?: string
}>()
</script>

<template>
  <div
    class="bg-white border border-[#EAE5DA] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border-l-4"
    :style="borderColor ? { borderLeftColor: borderColor } : { borderLeftColor: 'transparent' }"
    :data-testid="testid"
  >
    <div class="flex items-center justify-between mb-3">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        :style="{ backgroundColor: iconBg }"
        aria-hidden="true"
      >
        <component :is="icon" :size="20" :style="{ color }" />
      </div>
      <p class="text-xs font-semibold uppercase tracking-widest text-[#A89880] text-right leading-tight max-w-[60%]">
        {{ label }}
      </p>
    </div>
    <p class="text-2xl font-black" :style="{ color }" :data-testid="valueTestid">
      {{ value }}
    </p>
  </div>
</template>
