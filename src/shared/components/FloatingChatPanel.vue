<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Bot, Send, Sparkles, User as UserIcon } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useAiInsights } from '~/modules/insights/composables/useAiInsights'

const auth = useAuthStore()
const {
  chatMessages,
  isSendingChat,
  chatError,
  isAiAvailable,
  isDemo,
  sendMessage,
} = useAiInsights()

const chatInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

const firstName = computed(() => auth.currentUser?.displayName?.split(' ')[0] ?? '')
const greeting = computed(() =>
  firstName.value
    ? `Hola ${firstName.value}, soy MoneiAI. ¿Qué querés saber de tus finanzas?`
    : 'Hola, soy MoneiAI. ¿Qué querés saber de tus finanzas?',
)

const quickChips = [
  { label: 'Dame mi diagnóstico', prompt: 'Dame un diagnóstico breve de mi situación financiera en 3 oraciones.' },
  { label: '¿Cómo ahorro más?', prompt: '¿Cómo puedo ahorrar más este mes? Dame 2 acciones concretas con montos.' },
  { label: '¿Qué deuda pago primero?', prompt: '¿Qué deuda o tarjeta me conviene pagar primero y por qué?' },
  { label: 'Resumen de mi mes', prompt: 'Dame un resumen corto de ingresos vs gastos este mes.' },
]

watch(
  () => chatMessages.value.length,
  async () => {
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  },
)

function handleSend() {
  const msg = chatInput.value.trim()
  if (!msg || isSendingChat.value) return
  chatInput.value = ''
  sendMessage(msg)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Not available states -->
    <div
      v-if="!isAiAvailable"
      class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-50">
        <Sparkles :size="22" class="text-purple-500" />
      </div>
      <p class="text-sm font-semibold text-[#1A1A2E]">
        {{ isDemo ? 'MoneiAI no disponible en modo demo' : 'Aún no hay datos para analizar' }}
      </p>
      <p class="text-xs text-[#94A3B8]">
        {{ isDemo ? 'Iniciá sesión con tu cuenta para chatear con MoneiAI.' : 'Agregá ingresos o gastos para activar el chat.' }}
      </p>
    </div>

    <template v-else>
      <!-- Messages area -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
        <!-- Greeting bubble -->
        <div class="flex gap-2 justify-start">
          <div class="w-7 h-7 rounded-full flex items-center justify-center bg-purple-100 shrink-0">
            <Bot :size="14" class="text-purple-600" />
          </div>
          <div class="max-w-[80%] p-3 rounded-xl rounded-bl-md bg-white border border-[#EEEEF0] text-xs leading-relaxed text-[#1A1A2E]">
            {{ greeting }}
          </div>
        </div>

        <!-- Chat messages -->
        <div
          v-for="(msg, i) in chatMessages"
          :key="i"
          class="flex gap-2"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            v-if="msg.role === 'assistant'"
            class="w-7 h-7 rounded-full flex items-center justify-center bg-purple-100 shrink-0"
          >
            <Bot :size="14" class="text-purple-600" />
          </div>
          <div
            class="max-w-[80%] p-3 rounded-xl text-xs leading-relaxed"
            :class="
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-md'
                : 'bg-white border border-[#EEEEF0] text-[#1A1A2E] rounded-bl-md'
            "
            style="white-space: pre-wrap"
          >{{ msg.content }}</div>
          <div
            v-if="msg.role === 'user'"
            class="w-7 h-7 rounded-full flex items-center justify-center bg-[#EEEEF0] shrink-0"
          >
            <UserIcon :size="14" class="text-[#64748B]" />
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isSendingChat" class="flex gap-2 justify-start">
          <div class="w-7 h-7 rounded-full flex items-center justify-center bg-purple-100 shrink-0">
            <Bot :size="14" class="text-purple-600" />
          </div>
          <div class="px-4 py-3 rounded-xl bg-white border border-[#EEEEF0] rounded-bl-md">
            <div class="flex gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 0ms" />
              <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 150ms" />
              <div class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay: 300ms" />
            </div>
          </div>
        </div>

        <p v-if="chatError" class="text-xs text-red-500 text-center">{{ chatError }}</p>
      </div>

      <!-- Quick chips (only if no conversation yet) -->
      <div
        v-if="chatMessages.length === 0 && !isSendingChat"
        class="px-4 pb-2 flex flex-wrap gap-1.5"
      >
        <button
          v-for="chip in quickChips"
          :key="chip.label"
          class="text-[11px] px-3 py-1.5 rounded-full bg-white text-purple-600 hover:bg-purple-100 transition-colors border border-purple-100"
          @click="sendMessage(chip.prompt)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Input -->
      <div class="px-3 py-3 border-t border-[#EEEEF0] bg-white">
        <div class="flex gap-2 items-center">
          <input
            v-model="chatInput"
            type="text"
            placeholder="Escribí tu pregunta..."
            class="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#EEEEF0] focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-[#94A3B8]"
            :disabled="isSendingChat"
            @keydown="handleKeydown"
          />
          <button
            :disabled="!chatInput.trim() || isSendingChat"
            class="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 transition-colors shrink-0"
            @click="handleSend"
          >
            <Send :size="16" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
