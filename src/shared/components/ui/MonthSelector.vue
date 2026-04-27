<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'

const { monthLabel, isCurrentMonth, prevMonth, nextMonth } = useSelectedMonth()
</script>

<template>
  <div class="flex items-center gap-0.5 bg-white border border-[#E5E0D5] rounded-full px-1 py-1 shadow-sm">
    <button
      type="button"
      class="w-7 h-7 rounded-full flex items-center justify-center text-[#5A5854] hover:bg-[#F8F6F1] hover:text-[#1C1B18] transition-colors"
      aria-label="Mes anterior"
      @click="prevMonth"
    >
      <ChevronLeft :size="14" />
    </button>
    <span class="text-xs font-semibold text-[#1C1B18] capitalize px-2 min-w-[112px] text-center select-none">
      {{ monthLabel }}
    </span>
    <button
      type="button"
      class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
      :class="isCurrentMonth ? 'text-[#C5C1BB] cursor-not-allowed' : 'text-[#5A5854] hover:bg-[#F8F6F1] hover:text-[#1C1B18]'"
      :disabled="isCurrentMonth"
      aria-label="Mes siguiente"
      @click="nextMonth"
    >
      <ChevronRight :size="14" />
    </button>
  </div>
</template>
