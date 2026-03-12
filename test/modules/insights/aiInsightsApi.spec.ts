import { describe, it, expect, vi } from 'vitest'
import { fetchAiInsights, sendAiChat } from '~/modules/insights/services/aiInsightsApi'
import { supabase } from '~/config/supabase'
import type { FinancialSummaryPayload } from '~/modules/insights/services/aiInsightsApi'

const samplePayload: FinancialSummaryPayload = {
  totalIngresos: 5000,
  totalGastado: 3000,
  gastosPorCategoria: [{ nombre: 'Comida', monto: 1500 }],
  deudas: [{ nombre: 'Banco', pendiente: 10000, tasaInteres: 12, cuotaMensual: 500 }],
  tarjetas: [{ descripcion: 'Visa', lineaTotal: 10000, deudaActual: 3000 }],
  score: 65,
}

describe('aiInsightsApi', () => {
  describe('fetchAiInsights', () => {
    it('calls supabase.functions.invoke with correct body', async () => {
      await fetchAiInsights(samplePayload)

      expect(supabase.functions.invoke).toHaveBeenCalledWith('ai-insights', {
        body: { financialData: samplePayload, action: 'analyze' },
      })
    })

    it('returns the analysis object from the response', async () => {
      const mockAnalysis = { score: 80, summary: 'Good financial health' }
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { analysis: mockAnalysis },
        error: null,
      })

      const result = await fetchAiInsights(samplePayload)

      expect(result).toEqual(mockAnalysis)
    })

    it('throws when error is returned', async () => {
      const mockError = new Error('Network error')
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: mockError,
      })

      await expect(fetchAiInsights(samplePayload)).rejects.toThrow('Network error')
    })
  })

  describe('sendAiChat', () => {
    const message = 'How can I save more?'
    const conversationHistory = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ]

    it('calls supabase.functions.invoke with correct body', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { reply: 'Some reply' },
        error: null,
      })

      await sendAiChat(samplePayload, message, conversationHistory)

      expect(supabase.functions.invoke).toHaveBeenCalledWith('ai-insights', {
        body: {
          financialData: samplePayload,
          action: 'chat',
          message,
          conversationHistory,
        },
      })
    })

    it('returns the reply string', async () => {
      const mockReply = 'You could reduce spending on dining out.'
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { reply: mockReply },
        error: null,
      })

      const result = await sendAiChat(samplePayload, message, conversationHistory)

      expect(result).toBe(mockReply)
    })

    it('throws when error is returned', async () => {
      const mockError = new Error('Service unavailable')
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: mockError,
      })

      await expect(sendAiChat(samplePayload, message, conversationHistory)).rejects.toThrow(
        'Service unavailable',
      )
    })
  })
})
