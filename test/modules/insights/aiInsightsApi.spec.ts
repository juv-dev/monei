import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAiInsights, sendAiChat } from '~/modules/insights/services/aiInsightsApi'
import type { FinancialSummaryPayload } from '~/modules/insights/services/aiInsightsApi'

const samplePayload: FinancialSummaryPayload = {
  totalIngresos: 5000,
  totalGastado: 3000,
  gastosPorCategoria: [{ nombre: 'Comida', monto: 1500 }],
  deudas: [{ nombre: 'Banco', pendiente: 10000, tasaInteres: 12, cuotaMensual: 500 }],
  tarjetas: [{ descripcion: 'Visa', lineaTotal: 10000, deudaActual: 3000 }],
  score: 65,
}

function jsonResponse(payload: unknown, init?: { status?: number; statusText?: string }): Response {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('aiInsightsApi', () => {
  beforeEach(() => {
    vi.mocked(globalThis.fetch).mockClear()
  })

  describe('fetchAiInsights', () => {
    it('should call fetch with the analyze body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse({ analysis: {} }))

      await fetchAiInsights(samplePayload)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai-insights',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ financialData: samplePayload, action: 'analyze' }),
        }),
      )
    })

    it('should return the analysis object from the response', async () => {
      const mockAnalysis = { score: 80, summary: 'Good financial health' }
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse({ analysis: mockAnalysis }))

      const result = await fetchAiInsights(samplePayload)

      expect(result).toEqual(mockAnalysis)
    })

    it('should throw when fetch returns a non-ok response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response('Network error', { status: 500, statusText: 'Server Error' }),
      )

      await expect(fetchAiInsights(samplePayload)).rejects.toThrow(/AI API 500/)
    })
  })

  describe('sendAiChat', () => {
    const message = 'How can I save more?'
    const conversationHistory = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ]

    it('should call fetch with the chat body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse({ reply: 'Some reply' }))

      await sendAiChat(samplePayload, message, conversationHistory)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ai-insights',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            financialData: samplePayload,
            action: 'chat',
            message,
            conversationHistory,
          }),
        }),
      )
    })

    it('should return the reply string', async () => {
      const mockReply = 'You could reduce spending on dining out.'
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse({ reply: mockReply }))

      const result = await sendAiChat(samplePayload, message, conversationHistory)

      expect(result).toBe(mockReply)
    })

    it('should throw when fetch returns a non-ok response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response('Service unavailable', { status: 503, statusText: 'Service Unavailable' }),
      )

      await expect(sendAiChat(samplePayload, message, conversationHistory)).rejects.toThrow(
        /AI API 503/,
      )
    })
  })
})
