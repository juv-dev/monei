import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useIngresos } from '~/modules/ingresos/composables/useIngresos'
import { usePresupuesto } from '~/modules/presupuesto/composables/usePresupuesto'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useTarjetas } from '~/modules/tarjetas/composables/useTarjetas'
import { useInsights } from './useInsights'
import {
  fetchAiInsights,
  sendAiChat,
  type AiAnalysis,
  type ChatMessage,
  type FinancialSummaryPayload,
} from '../services/aiInsightsApi'

export function useAiInsights() {
  const auth = useAuthStore()
  const isDemo = computed(() => auth.currentUser?.provider === 'demo')

  const { totalIngresos } = useIngresos()
  const { porCategoria, totalGastado } = usePresupuesto()
  const { deudas } = useDeudas()
  const { tarjetas } = useTarjetas()
  const { score } = useInsights()

  const aiAnalysis = ref<AiAnalysis | null>(null)
  const isLoadingAi = ref(false)
  const isAiError = ref(false)
  const aiError = ref<string | null>(null)

  // Chat state
  const chatMessages = ref<ChatMessage[]>([])
  const isSendingChat = ref(false)
  const chatError = ref<string | null>(null)

  const hasEnoughData = computed(() => totalIngresos.value > 0 || totalGastado.value > 0)
  const isAiAvailable = computed(() => !isDemo.value && hasEnoughData.value)

  function buildPayload(): FinancialSummaryPayload {
    return {
      totalIngresos: totalIngresos.value,
      totalGastado: totalGastado.value,
      gastosPorCategoria: porCategoria.value.map((c) => ({
        nombre: c.nombre,
        monto: c.subtotal,
      })),
      deudas: (deudas.value ?? []).map((d) => ({
        nombre: d.nombrePersona,
        pendiente: d.montoActualPendiente,
        tasaInteres: d.tasaInteres,
        cuotaMensual: d.cuotaMensual ?? 0,
      })),
      tarjetas: (tarjetas.value ?? []).map((t) => ({
        descripcion: t.descripcion,
        lineaTotal: t.lineaTotal,
        deudaActual: t.montoDeudaActual,
      })),
      score: score.value.total,
    }
  }

  async function fetchAnalysis(): Promise<void> {
    if (isDemo.value || !hasEnoughData.value) return

    isLoadingAi.value = true
    isAiError.value = false
    aiError.value = null
    chatMessages.value = []

    try {
      const result = await fetchAiInsights(buildPayload())
      aiAnalysis.value = result
    } catch (err) {
      isAiError.value = true
      aiError.value = err instanceof Error ? err.message : 'Error al obtener análisis'
    } finally {
      isLoadingAi.value = false
    }
  }

  async function sendMessage(message: string): Promise<void> {
    if (!message.trim() || isSendingChat.value) return

    chatMessages.value.push({ role: 'user', content: message })
    isSendingChat.value = true
    chatError.value = null

    try {
      const reply = await sendAiChat(buildPayload(), message, chatMessages.value.slice(0, -1))
      chatMessages.value.push({ role: 'assistant', content: reply })
    } catch (err) {
      chatError.value = err instanceof Error ? err.message : 'Error al enviar mensaje'
      chatMessages.value.pop()
    } finally {
      isSendingChat.value = false
    }
  }

  return {
    aiAnalysis,
    isLoadingAi,
    isAiError,
    aiError,
    isAiAvailable,
    isDemo,
    fetchAnalysis,
    chatMessages,
    isSendingChat,
    chatError,
    sendMessage,
  }
}
