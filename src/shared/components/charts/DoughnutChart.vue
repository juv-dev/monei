<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  labels: string[]
  values: number[]
  colors: string[]
  centerLabel?: string
  centerValue?: string
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: props.colors,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      hoverBorderWidth: 3,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '72%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: number; label: string }) => {
          const formatted = new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
          }).format(ctx.parsed)
          return ` ${ctx.label}: ${formatted}`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="relative">
    <Doughnut :data="chartData" :options="chartOptions" />
    <!-- Center label -->
    <div
      v-if="centerLabel || centerValue"
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <p v-if="centerValue" class="text-lg font-black text-[#1C1612] leading-tight">
        {{ centerValue }}
      </p>
      <p v-if="centerLabel" class="text-xs text-[#A89880] font-medium mt-0.5">
        {{ centerLabel }}
      </p>
    </div>
  </div>
</template>
