<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import {
  BrainCircuit,
  RefreshCw,
  Lock,
  AlertCircle,
  AlertTriangle,
  Shield,
  Info,
  TrendingUp,
  PiggyBank,
  Target,
  CreditCard,
  ArrowDown,
  Zap,
  DollarSign,
  Send,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Trophy,
  User,
  Bot,
} from 'lucide-vue-next'
import { useAiInsights } from '../composables/useAiInsights'
import { useTypewriter } from '../composables/useTypewriter'
import type { ActionCategory, ActionImpact, AlertType, HealthGrade } from '../services/aiInsightsApi'
import { formatMoneyDisplay } from '~/shared/utils/format'

const {
  aiAnalysis,
  isLoadingAi,
  isAiError,
  aiError,
  isAiAvailable,
  fetchAnalysis,
  chatMessages,
  isSendingChat,
  chatError,
  sendMessage,
} = useAiInsights()

const { displayText, isTyping, type: typeText, skipToEnd } = useTypewriter(15)

const chatInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const showChat = ref(false)

const gradeConfig: Record<HealthGrade, { color: string; bg: string; label: string }> = {
  A: { color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)', label: 'Excelente' },
  B: { color: '#2D9F8F', bg: 'rgba(45, 159, 143, 0.1)', label: 'Bueno' },
  C: { color: '#D4A017', bg: 'rgba(212, 160, 23, 0.1)', label: 'Regular' },
  D: { color: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)', label: 'Deficiente' },
  F: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.1)', label: 'Critico' },
}

const impactConfig: Record<ActionImpact, { color: string; bg: string; label: string }> = {
  alto: { color: '#16A34A', bg: 'bg-green-50', label: 'Alto' },
  medio: { color: '#D4A017', bg: 'bg-amber-50', label: 'Medio' },
  bajo: { color: '#64748B', bg: 'bg-slate-50', label: 'Bajo' },
}

const categoryIcons: Record<ActionCategory, typeof Sparkles> = {
  ahorro: PiggyBank,
  deuda: ArrowDown,
  gasto: Target,
  credito: CreditCard,
  ingreso: TrendingUp,
}

const alertConfig: Record<AlertType, { icon: typeof AlertCircle; color: string; bg: string; border: string }> = {
  urgente: { icon: AlertCircle, color: '#DC2626', bg: 'bg-red-50', border: 'border-red-200' },
  importante: { icon: AlertTriangle, color: '#D4A017', bg: 'bg-amber-50', border: 'border-amber-200' },
  preventiva: { icon: Info, color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200' },
}

const loadingMessages = [
  'Analizando tus ingresos y gastos...',
  'Evaluando tu nivel de endeudamiento...',
  'Calculando tu potencial de ahorro...',
  'Generando recomendaciones personalizadas...',
  'Preparando tu plan de acción...',
]
const loadingMessageIndex = ref(0)
let loadingInterval: ReturnType<typeof window.setInterval> | null = null

watch(isLoadingAi, (loading) => {
  if (loading) {
    loadingMessageIndex.value = 0
    loadingInterval = window.setInterval(() => {
      loadingMessageIndex.value = (loadingMessageIndex.value + 1) % loadingMessages.length
    }, 2500)
  } else {
    if (loadingInterval) {
      window.clearInterval(loadingInterval)
      loadingInterval = null
    }
  }
})

watch(aiAnalysis, (analysis) => {
  if (analysis?.resumen) {
    typeText(analysis.resumen)
  }
})

watch(
  () => chatMessages.value.length,
  async () => {
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  },
)

function handleSendChat() {
  if (!chatInput.value.trim()) return
  const msg = chatInput.value
  chatInput.value = ''
  sendMessage(msg)
}

function handleKeydown(e: globalThis.KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendChat()
  }
}

const quickQuestions = [
  'Como puedo ahorrar mas este mes?',
  'Que deuda deberia pagar primero?',
  'Mis gastos son normales?',
  'Cuanto deberia tener de fondo de emergencia?',
]

onMounted(() => {
  if (isAiAvailable.value) {
    fetchAnalysis()
  }
})
</script>

<template>
  <div class="space-y-4" data-testid="ai-section">
    <!-- Header Card with Gradient -->
    <div
      class="relative overflow-hidden rounded-2xl shadow-sm border border-[#EEEEF0]"
      :class="aiAnalysis ? 'bg-white' : 'bg-white'"
    >
      <!-- Gradient Header -->
      <div class="px-6 py-5" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
              <BrainCircuit :size="20" class="text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-white flex items-center gap-2">
                MoneiAI
                <span class="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full">Beta</span>
              </h2>
              <p class="text-xs text-white/70">Asesor financiero con inteligencia artificial</p>
            </div>
          </div>
          <button
            v-if="isAiAvailable && !isLoadingAi"
            class="text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
            @click="fetchAnalysis"
          >
            <RefreshCw :size="12" />
            Reanalizar
          </button>
        </div>
      </div>

      <!-- Not available for demo -->
      <div v-if="!isAiAvailable" class="flex flex-col items-center gap-3 p-8 text-center">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#F5F6FA]">
          <Lock :size="24" class="text-[#94A3B8]" />
        </div>
        <div>
          <p class="text-sm font-semibold text-[#1A1A2E]">Analisis con IA no disponible</p>
          <p class="text-xs text-[#94A3B8] mt-1">
            Inicia sesion con tu cuenta para acceder al asesor financiero con IA.
          </p>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="isLoadingAi" class="p-8">
        <div class="flex flex-col items-center gap-4">
          <!-- Animated brain -->
          <div class="relative">
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-100 to-violet-100 animate-pulse"
            >
              <BrainCircuit :size="28" class="text-purple-600" />
            </div>
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-ping" />
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-[#1A1A2E]">Analizando tus finanzas</p>
            <p class="text-xs text-[#94A3B8] mt-1 transition-all duration-300">
              {{ loadingMessages[loadingMessageIndex] }}
            </p>
          </div>
          <!-- Progress dots -->
          <div class="flex gap-1.5">
            <div
              v-for="i in 5"
              :key="i"
              class="w-2 h-2 rounded-full transition-all duration-300"
              :class="i - 1 <= loadingMessageIndex ? 'bg-purple-500 scale-110' : 'bg-purple-200'"
            />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="isAiError" class="p-6">
        <div class="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle :size="16" style="color: #dc2626" class="shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold text-red-700">No se pudo generar el analisis</p>
            <p class="text-xs text-red-600 mt-0.5">{{ aiError }}</p>
            <button
              class="text-xs text-red-700 font-medium mt-2 hover:underline flex items-center gap-1"
              @click="fetchAnalysis"
            >
              <RefreshCw :size="10" /> Intentar de nuevo
            </button>
          </div>
        </div>
      </div>

      <!-- AI Results -->
      <div v-else-if="aiAnalysis" class="p-6 space-y-5">
        <!-- Grade + Summary Row -->
        <div class="flex gap-4">
          <!-- Grade Badge -->
          <div class="shrink-0">
            <div
              class="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2"
              :style="{
                backgroundColor: gradeConfig[aiAnalysis.calificacion].bg,
                borderColor: gradeConfig[aiAnalysis.calificacion].color + '40',
              }"
            >
              <span class="text-3xl font-black" :style="{ color: gradeConfig[aiAnalysis.calificacion].color }">
                {{ aiAnalysis.calificacion }}
              </span>
              <span
                class="text-[9px] font-bold uppercase tracking-wider"
                :style="{ color: gradeConfig[aiAnalysis.calificacion].color }"
              >
                {{ gradeConfig[aiAnalysis.calificacion].label }}
              </span>
            </div>
          </div>
          <!-- Summary with typewriter -->
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-[#8B5CF6] uppercase tracking-wide mb-1.5">Diagnostico</p>
            <p class="text-sm text-[#1A1A2E] leading-relaxed">
              {{ displayText
              }}<span v-if="isTyping" class="inline-block w-0.5 h-4 bg-purple-500 ml-0.5 animate-pulse align-middle" />
            </p>
            <button
              v-if="isTyping"
              class="text-[10px] text-[#94A3B8] hover:text-[#64748B] mt-1"
              @click="skipToEnd(aiAnalysis.resumen)"
            >
              Mostrar todo
            </button>
          </div>
        </div>

        <!-- Health Indicators -->
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="(item, key) in {
              'Ingresos vs Gastos': aiAnalysis.saludFinanciera.ingresosVsGastos,
              'Nivel de Deuda': aiAnalysis.saludFinanciera.nivelDeuda,
              'Uso de Credito': aiAnalysis.saludFinanciera.usoCredito,
            }"
            :key="key"
            class="p-3 rounded-xl bg-[#FAFAFA] border border-[#EEEEF0]"
          >
            <p class="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">{{ key }}</p>
            <p
              class="text-xs font-bold mt-1 capitalize"
              :style="{
                color:
                  item.estado === 'positivo' || item.estado === 'bajo' || item.estado === 'optimo'
                    ? '#16A34A'
                    : item.estado === 'neutro' || item.estado === 'moderado' || item.estado === 'aceptable'
                      ? '#D4A017'
                      : '#DC2626',
              }"
            >
              {{ item.estado }}
            </p>
            <p class="text-[10px] text-[#64748B] mt-0.5 line-clamp-2">{{ item.detalle }}</p>
          </div>
        </div>

        <!-- Savings Potential -->
        <div
          v-if="aiAnalysis.potencialAhorro.montoMensual > 0"
          class="p-4 rounded-xl border border-green-200"
          style="background: linear-gradient(135deg, rgba(22, 163, 74, 0.05) 0%, rgba(45, 159, 143, 0.05) 100%)"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
              <PiggyBank :size="18" class="text-green-600" />
            </div>
            <div class="flex-1">
              <p class="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Potencial de Ahorro</p>
              <p class="text-lg font-black text-green-700">
                S/{{ formatMoneyDisplay(aiAnalysis.potencialAhorro.montoMensual) }}
                <span class="text-xs font-normal text-green-600">/mes</span>
              </p>
            </div>
          </div>
          <p class="text-xs text-[#64748B] mt-2">{{ aiAnalysis.potencialAhorro.estrategia }}</p>
        </div>

        <!-- Alerts -->
        <div v-if="aiAnalysis.alertas.length > 0" class="space-y-2">
          <p class="text-xs font-bold text-[#1A1A2E] uppercase tracking-wide flex items-center gap-1.5">
            <Shield :size="12" class="text-red-500" />
            Alertas
          </p>
          <div
            v-for="(alerta, i) in aiAnalysis.alertas"
            :key="'alert-' + i"
            class="flex items-start gap-2.5 p-3 rounded-xl border"
            :class="[alertConfig[alerta.tipo].bg, alertConfig[alerta.tipo].border]"
          >
            <component
              :is="alertConfig[alerta.tipo].icon"
              :size="14"
              :style="{ color: alertConfig[alerta.tipo].color }"
              class="shrink-0 mt-0.5"
            />
            <div class="flex-1">
              <span
                class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                :style="{
                  color: alertConfig[alerta.tipo].color,
                  backgroundColor: alertConfig[alerta.tipo].color + '15',
                }"
              >
                {{ alerta.tipo }}
              </span>
              <p class="text-xs text-[#1A1A2E] mt-1">{{ alerta.mensaje }}</p>
            </div>
          </div>
        </div>

        <!-- Action Plan -->
        <div v-if="aiAnalysis.planAccion.length > 0">
          <p class="text-xs font-bold text-[#1A1A2E] uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Zap :size="12" class="text-purple-500" />
            Plan de Accion
          </p>
          <div class="space-y-2">
            <div
              v-for="action in aiAnalysis.planAccion"
              :key="action.prioridad"
              class="flex items-start gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#EEEEF0] group hover:border-purple-200 transition-colors"
            >
              <!-- Priority number -->
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                :style="{
                  backgroundColor: action.prioridad <= 2 ? '#8B5CF6' : action.prioridad <= 4 ? '#A78BFA' : '#C4B5FD',
                }"
              >
                {{ action.prioridad }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-[#1A1A2E]">{{ action.accion }}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                    <component :is="categoryIcons[action.categoria] ?? Target" :size="10" />
                    {{ action.categoria }}
                  </span>
                  <span
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    :class="impactConfig[action.impacto].bg"
                    :style="{ color: impactConfig[action.impacto].color }"
                  >
                    Impacto {{ impactConfig[action.impacto].label }}
                  </span>
                </div>
              </div>
              <ChevronRight
                :size="14"
                class="text-[#D1D5DB] shrink-0 mt-1 group-hover:text-purple-400 transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Projection -->
        <div v-if="aiAnalysis.proyeccion" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-4 rounded-xl bg-green-50 border border-green-200">
            <p class="text-[10px] font-bold text-green-700 uppercase tracking-wide flex items-center gap-1 mb-2">
              <TrendingUp :size="10" />
              Si sigues el plan
            </p>
            <p class="text-xs text-green-800 leading-relaxed">{{ aiAnalysis.proyeccion.optimista }}</p>
          </div>
          <div class="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-2">
              <AlertTriangle :size="10" />
              Sin cambios
            </p>
            <p class="text-xs text-amber-800 leading-relaxed">{{ aiAnalysis.proyeccion.actual }}</p>
          </div>
        </div>

        <!-- Suggested Goal -->
        <div
          v-if="aiAnalysis.metaSugerida"
          class="p-4 rounded-xl border border-purple-200"
          style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(109, 40, 217, 0.05) 100%)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 shrink-0">
              <Trophy :size="18" class="text-purple-600" />
            </div>
            <div>
              <p class="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Meta Sugerida</p>
              <p class="text-sm font-semibold text-[#1A1A2E] mt-1">{{ aiAnalysis.metaSugerida.descripcion }}</p>
              <div class="flex items-center gap-3 mt-2">
                <span class="flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <DollarSign :size="12" />
                  S/{{ formatMoneyDisplay(aiAnalysis.metaSugerida.montoObjetivo) }}
                </span>
                <span class="flex items-center gap-1 text-xs text-[#94A3B8]">
                  <Target :size="12" />
                  {{ aiAnalysis.metaSugerida.plazoMeses }} meses
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="border-t border-[#EEEEF0] pt-4">
          <button
            v-if="!showChat"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FAFAFA] border border-[#EEEEF0] hover:border-purple-300 hover:bg-purple-50 transition-all text-sm text-[#64748B] hover:text-purple-600"
            @click="showChat = true"
          >
            <MessageCircle :size="16" />
            Preguntale a MoneiAI sobre tus finanzas
          </button>

          <div v-else class="space-y-3">
            <p class="text-xs font-bold text-[#1A1A2E] uppercase tracking-wide flex items-center gap-1.5">
              <MessageCircle :size="12" class="text-purple-500" />
              Chat con MoneiAI
            </p>

            <!-- Quick questions -->
            <div v-if="chatMessages.length === 0" class="flex flex-wrap gap-2">
              <button
                v-for="q in quickQuestions"
                :key="q"
                class="text-[11px] px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors border border-purple-100"
                @click="sendMessage(q)"
              >
                {{ q }}
              </button>
            </div>

            <!-- Messages -->
            <div
              v-if="chatMessages.length > 0"
              ref="chatContainer"
              class="max-h-64 overflow-y-auto space-y-3 scroll-smooth"
            >
              <div
                v-for="(msg, i) in chatMessages"
                :key="i"
                class="flex gap-2"
                :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  v-if="msg.role === 'assistant'"
                  class="w-6 h-6 rounded-full flex items-center justify-center bg-purple-100 shrink-0 mt-0.5"
                >
                  <Bot :size="12" class="text-purple-600" />
                </div>
                <div
                  class="max-w-[80%] p-3 rounded-xl text-xs leading-relaxed"
                  :class="
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-[#F5F6FA] text-[#1A1A2E] rounded-bl-md'
                  "
                  style="white-space: pre-wrap"
                >
                  {{ msg.content }}
                </div>
                <div
                  v-if="msg.role === 'user'"
                  class="w-6 h-6 rounded-full flex items-center justify-center bg-[#EEEEF0] shrink-0 mt-0.5"
                >
                  <User :size="12" class="text-[#64748B]" />
                </div>
              </div>

              <!-- Typing indicator -->
              <div v-if="isSendingChat" class="flex gap-2 justify-start">
                <div class="w-6 h-6 rounded-full flex items-center justify-center bg-purple-100 shrink-0">
                  <Bot :size="12" class="text-purple-600" />
                </div>
                <div class="px-4 py-3 rounded-xl bg-[#F5F6FA] rounded-bl-md">
                  <div class="flex gap-1">
                    <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 0ms" />
                    <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 150ms" />
                    <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 300ms" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Chat error -->
            <p v-if="chatError" class="text-xs text-red-500">{{ chatError }}</p>

            <!-- Input -->
            <div class="flex gap-2">
              <input
                v-model="chatInput"
                type="text"
                placeholder="Escribe tu pregunta..."
                class="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#EEEEF0] focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-[#94A3B8]"
                :disabled="isSendingChat"
                @keydown="handleKeydown"
              />
              <button
                :disabled="!chatInput.trim() || isSendingChat"
                class="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 transition-colors shrink-0"
                @click="handleSendChat"
              >
                <Send :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
