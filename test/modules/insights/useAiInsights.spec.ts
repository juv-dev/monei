import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useAiInsights } from '~/modules/insights/composables/useAiInsights'
import { ingresosApi } from '~/modules/ingresos/services/api'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import * as aiInsightsApi from '~/modules/insights/services/aiInsightsApi'
import type { AiAnalysis } from '~/modules/insights/services/aiInsightsApi'

const mockAnalysis: AiAnalysis = {
  calificacion: 'B',
  calificacionDetalle: 'Buena salud financiera',
  resumen: 'Tu situación financiera es estable.',
  saludFinanciera: {
    ingresosVsGastos: { estado: 'positivo', detalle: 'Gastas menos de lo que ganas' },
    nivelDeuda: { estado: 'bajo', detalle: 'Nivel de deuda manejable' },
    usoCredito: { estado: 'optimo', detalle: 'Uso de crédito óptimo' },
  },
  potencialAhorro: { montoMensual: 500, estrategia: 'Reducir gastos de comida' },
  planAccion: [
    { prioridad: 1, accion: 'Crear fondo de emergencia', impacto: 'alto', categoria: 'ahorro' },
  ],
  alertas: [{ tipo: 'importante', mensaje: 'Revisar gastos mensuales' }],
  proyeccion: { optimista: 'Ahorrarás 6000 al año', actual: 'Balance estable' },
  metaSugerida: { descripcion: 'Fondo de emergencia', montoObjetivo: 10000, plazoMeses: 12 },
}

describe('useAiInsights', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function setupWithUser(userId = 'demo') {
    const setup = withSetup(() => useAiInsights())
    const auth = useAuthStore()
    auth.$patch({
      user: { id: userId, username: userId, displayName: 'Test', provider: userId === 'demo' ? 'demo' : 'email' },
      isAuthenticated: true,
    })
    return { ...setup, auth }
  }

  // ─── Initial state ──────────────────────────────────────────────────────
  it('should have correct initial state', () => {
    const { result } = setupWithUser()

    expect(result.aiAnalysis.value).toBeNull()
    expect(result.isLoadingAi.value).toBe(false)
    expect(result.isAiError.value).toBe(false)
    expect(result.aiError.value).toBeNull()
    expect(result.chatMessages.value).toEqual([])
    expect(result.isSendingChat.value).toBe(false)
    expect(result.chatError.value).toBeNull()
  })

  // ─── isAiAvailable ─────────────────────────────────────────────────────
  it('should not be available for demo users', () => {
    const { result } = setupWithUser('demo')
    expect(result.isAiAvailable.value).toBe(false)
  })

  it('should not be available when no financial data exists', () => {
    const { result } = setupWithUser('real-user')
    expect(result.isAiAvailable.value).toBe(false)
  })

  it('should be available for non-demo user with data', async () => {
    await ingresosApi.create('demo', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('demo')
    // Demo user always unavailable
    expect(result.isAiAvailable.value).toBe(false)
  })

  // ─── fetchAnalysis ──────────────────────────────────────────────────────
  it('should not fetch for demo users', async () => {
    const spy = vi.spyOn(aiInsightsApi, 'fetchAiInsights')

    const { result } = setupWithUser('demo')
    await result.fetchAnalysis()

    expect(spy).not.toHaveBeenCalled()
    expect(result.aiAnalysis.value).toBeNull()
  })

  it('should not fetch when no data exists', async () => {
    const spy = vi.spyOn(aiInsightsApi, 'fetchAiInsights')

    const { result } = setupWithUser('real-user')
    await result.fetchAnalysis()

    expect(spy).not.toHaveBeenCalled()
  })

  it('should fetch analysis for authenticated user with data', async () => {
    await ingresosApi.create('demo', { monto: 5000, descripcion: 'Salario' })
    const spy = vi.spyOn(aiInsightsApi, 'fetchAiInsights').mockResolvedValue(mockAnalysis)

    const { result } = setupWithUser('jugaz')
    // Need data in the composable's reactive state - since the composable reads from useIngresos
    // which uses TanStack Query with the 'jugaz' user, data is loaded via Supabase mock
    // For this test, create data for 'jugaz' via Supabase mock
    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })
    await flushPromises()

    await result.fetchAnalysis()

    expect(spy).toHaveBeenCalled()
    expect(result.aiAnalysis.value).toEqual(mockAnalysis)
    expect(result.isLoadingAi.value).toBe(false)
    expect(result.isAiError.value).toBe(false)
  })

  it('should set error state when fetch fails', async () => {
    vi.spyOn(aiInsightsApi, 'fetchAiInsights').mockRejectedValue(new Error('API error'))

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()
    await result.fetchAnalysis()

    expect(result.isAiError.value).toBe(true)
    expect(result.aiError.value).toBe('API error')
    expect(result.aiAnalysis.value).toBeNull()
  })

  it('should set generic error when non-Error is thrown', async () => {
    vi.spyOn(aiInsightsApi, 'fetchAiInsights').mockRejectedValue('unknown')

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()
    await result.fetchAnalysis()

    expect(result.aiError.value).toBe('Error al obtener análisis')
  })

  it('should clear chat messages on new analysis', async () => {
    vi.spyOn(aiInsightsApi, 'fetchAiInsights').mockResolvedValue(mockAnalysis)

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()

    // Simulate existing chat messages
    result.chatMessages.value = [{ role: 'user', content: 'test' }]

    await result.fetchAnalysis()

    expect(result.chatMessages.value).toEqual([])
  })

  // ─── sendMessage ────────────────────────────────────────────────────────
  it('should send a chat message and receive reply', async () => {
    vi.spyOn(aiInsightsApi, 'sendAiChat').mockResolvedValue('Aquí tienes un consejo.')

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()
    await result.sendMessage('Como puedo ahorrar?')

    expect(result.chatMessages.value).toHaveLength(2)
    expect(result.chatMessages.value[0]).toEqual({ role: 'user', content: 'Como puedo ahorrar?' })
    expect(result.chatMessages.value[1]).toEqual({ role: 'assistant', content: 'Aquí tienes un consejo.' })
    expect(result.isSendingChat.value).toBe(false)
  })

  it('should not send empty messages', async () => {
    const spy = vi.spyOn(aiInsightsApi, 'sendAiChat')

    const { result } = setupWithUser('jugaz')
    await result.sendMessage('')
    await result.sendMessage('   ')

    expect(spy).not.toHaveBeenCalled()
    expect(result.chatMessages.value).toHaveLength(0)
  })

  it('should handle chat error and remove user message', async () => {
    vi.spyOn(aiInsightsApi, 'sendAiChat').mockRejectedValue(new Error('Chat failed'))

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()
    await result.sendMessage('test message')

    expect(result.chatError.value).toBe('Chat failed')
    expect(result.chatMessages.value).toHaveLength(0) // user message popped on error
  })

  it('should handle non-Error chat errors', async () => {
    vi.spyOn(aiInsightsApi, 'sendAiChat').mockRejectedValue('something')

    await ingresosApi.create('jugaz', { monto: 5000, descripcion: 'Salario' })

    const { result } = setupWithUser('jugaz')
    await flushPromises()
    await result.sendMessage('test')

    expect(result.chatError.value).toBe('Error al enviar mensaje')
  })
})
