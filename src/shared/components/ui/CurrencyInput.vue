<script setup lang="ts">
import { formatMoneyDisplay, onDecimalInput } from '~/shared/utils/format'

withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    id?: string
    accentColor?: string
    testid?: string
    label?: string
  }>(),
  { placeholder: '0.00', accentColor: '#B6A77A' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">
      {{ label }}
    </label>
    <input
      :id="id"
      type="text"
      inputmode="decimal"
      :value="modelValue"
      :placeholder="placeholder"
      :data-testid="testid"
      class="w-full px-4 py-3 border border-[#EEEEF0] rounded-xl text-sm bg-[#F5F6FA] text-[#1A1A2E] placeholder-[#94A3B8] focus:outline-none focus:border-transparent focus:bg-white transition-all"
      :style="`--tw-ring-color: ${accentColor}4D`"
      style="--tw-ring-shadow: 0 0 0 2px var(--tw-ring-color)"
      @focus="($event.target as HTMLElement).style.boxShadow = `0 0 0 2px ${accentColor}4D`"
      @blur="
        ;($event.target as HTMLElement).style.boxShadow = ''
        emit('update:modelValue', formatMoneyDisplay(modelValue))
      "
      @input="onDecimalInput($event, (v) => emit('update:modelValue', v))"
    />
  </div>
</template>
