<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    buttonLabel?: string
    buttonColor?: string
    buttonTestid?: string
  }>(),
  { buttonColor: '#B6A77A' },
)

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-[#64748B] mt-0.5">{{ subtitle }}</p>
    </div>
    <button
      v-if="buttonLabel"
      class="flex items-center gap-2 py-2.5 px-4 text-white font-bold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-95 text-sm"
      :style="{ background: `linear-gradient(135deg, ${buttonColor} 0%, ${buttonColor}CC 100%)` }"
      :data-testid="buttonTestid"
      @click="emit('action')"
    >
      <Plus :size="16" aria-hidden="true" />
      {{ buttonLabel }}
    </button>
  </div>
</template>
