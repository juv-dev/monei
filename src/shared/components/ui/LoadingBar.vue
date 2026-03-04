<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ active: boolean; color: string }>()

const visible = ref(false)
const width = ref(0)

watch(
  () => props.active,
  (val) => {
    if (val) {
      visible.value = true
      width.value = 0
      // Allow DOM to render at 0% then animate to 85%
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          width.value = 85
        })
      })
    } else {
      // Complete the bar
      width.value = 100
      setTimeout(() => {
        visible.value = false
        width.value = 0
      }, 500)
    }
  },
)
</script>

<template>
  <div
    v-show="visible"
    class="fixed bottom-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none"
  >
    <div
      class="h-full"
      :class="width < 100 ? 'transition-[width] duration-[1500ms] ease-out' : 'transition-[width] duration-300 ease-in'"
      :style="{ width: `${width}%`, backgroundColor: props.color }"
    />
  </div>
</template>
