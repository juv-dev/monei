<script setup lang="ts">
import { ref } from 'vue'
import { X, ArrowRight, ArrowLeft, Wallet, PiggyBank, CreditCard, TrendingUp, BarChart3 } from 'lucide-vue-next'

const emit = defineEmits<{ close: [] }>()

const currentStep = ref(0)

const steps = [
  {
    icon: Wallet,
    color: '#B6A77A',
    title: 'Bienvenido a Monei',
    description: 'Tu plataforma de finanzas personales. Aquí puedes controlar tus ingresos, gastos, deudas y tarjetas de crédito en un solo lugar.',
  },
  {
    icon: PiggyBank,
    color: '#2D9F8F',
    title: 'Datos de ejemplo cargados',
    description: 'Hemos cargado datos de ejemplo para que explores la plataforma: ingresos, gastos por categoría, deudas y tarjetas de crédito.',
  },
  {
    icon: BarChart3,
    color: '#4285F4',
    title: 'Dashboard',
    description: 'En el dashboard verás un resumen general de tus finanzas: balance, ingresos vs gastos, y tus últimos movimientos.',
  },
  {
    icon: CreditCard,
    color: '#8B5CF6',
    title: 'Gestiona todo',
    description: 'Usa el menú lateral para navegar entre Ingresos, Presupuesto (gastos), Deudas y Tarjetas. Puedes agregar, editar y eliminar registros.',
  },
  {
    icon: TrendingUp,
    color: '#F59E0B',
    title: 'Insights inteligentes',
    description: 'En la sección de Insights encontrarás un análisis automático: puntaje financiero, alertas, proyecciones de deuda y recomendaciones personalizadas.',
  },
]

function next(): void {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    finish()
  }
}

function prev(): void {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function finish(): void {
  localStorage.setItem('monei_demo_onboarding_done', '1')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="finish" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden">
        <!-- Progress bar -->
        <div class="h-1 bg-[#EEEEF0]">
          <div
            class="h-full bg-[#2D9F8F] transition-all duration-300"
            :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
          />
        </div>

        <!-- Close button -->
        <button
          class="absolute top-4 right-4 text-[#94A3B8] hover:text-[#64748B] z-10"
          @click="finish"
        >
          <X :size="18" />
        </button>

        <!-- Content -->
        <div class="p-8 text-center">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            :style="{ background: `${steps[currentStep]!.color}18` }"
          >
            <component
              :is="steps[currentStep]!.icon"
              :size="24"
              :style="{ color: steps[currentStep]!.color }"
            />
          </div>
          <h3 class="text-lg font-bold text-[#1A1A2E] mb-3">
            {{ steps[currentStep]!.title }}
          </h3>
          <p class="text-sm text-[#64748B] leading-relaxed">
            {{ steps[currentStep]!.description }}
          </p>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between px-8 pb-6">
          <button
            v-if="currentStep > 0"
            class="flex items-center gap-1 text-sm text-[#94A3B8] hover:text-[#64748B]"
            @click="prev"
          >
            <ArrowLeft :size="14" />
            Anterior
          </button>
          <span v-else />
          <div class="flex gap-1.5">
            <div
              v-for="(_, i) in steps"
              :key="i"
              class="w-2 h-2 rounded-full transition-all"
              :class="i === currentStep ? 'bg-[#2D9F8F] w-5' : 'bg-[#EEEEF0]'"
            />
          </div>
          <button
            class="flex items-center gap-1 text-sm font-medium text-[#2D9F8F] hover:text-[#268F80]"
            @click="next"
          >
            {{ currentStep === steps.length - 1 ? 'Empezar' : 'Siguiente' }}
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
