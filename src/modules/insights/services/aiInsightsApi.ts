import { useAuth } from '@clerk/vue'

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F'
export type HealthStatus = 'positivo' | 'neutro' | 'negativo'
export type DebtLevel = 'bajo' | 'moderado' | 'alto' | 'critico'
export type CreditUsage = 'optimo' | 'aceptable' | 'elevado' | 'peligroso'
export type ActionImpact = 'alto' | 'medio' | 'bajo'
export type ActionCategory = 'ahorro' | 'deuda' | 'gasto' | 'credito' | 'ingreso'
export type AlertType = 'urgente' | 'importante' | 'preventiva'

export interface AiAnalysis {
  calificacion: HealthGrade
  calificacionDetalle: string
  resumen: string
  saludFinanciera: {
    ingresosVsGastos: { estado: HealthStatus; detalle: string }
    nivelDeuda: { estado: DebtLevel; detalle: string }
    usoCredito: { estado: CreditUsage; detalle: string }
  }
  potencialAhorro: {
    montoMensual: number
    estrategia: string
  }
  planAccion: {
    prioridad: number
    accion: string
    impacto: ActionImpact
    categoria: ActionCategory
  }[]
  alertas: {
    tipo: AlertType
    mensaje: string
  }[]
  proyeccion: {
    optimista: string
    actual: string
  }
  metaSugerida: {
    descripcion: string
    montoObjetivo: number
    plazoMeses: number
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FinancialSummaryPayload {
  totalIngresos: number
  totalGastado: number
  gastosPorCategoria: { nombre: string; monto: number }[]
  deudas: {
    nombre: string
    pendiente: number
    tasaInteres: number
    cuotaMensual: number
  }[]
  tarjetas: {
    descripcion: string
    lineaTotal: number
    deudaActual: number
  }[]
  score: number
}

const AI_ENDPOINT = '/api/ai-insights'

async function getClerkToken(): Promise<string | null> {
  try {
    const { getToken } = useAuth()
    return (await getToken.value?.({ template: 'neon' })) ?? null
  } catch {
    return null
  }
}

async function callAi<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getClerkToken()
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI API ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as T
}

export async function fetchAiInsights(data: FinancialSummaryPayload): Promise<AiAnalysis> {
  const result = await callAi<{ analysis: AiAnalysis }>({ financialData: data, action: 'analyze' })
  return result.analysis
}

export async function sendAiChat(
  data: FinancialSummaryPayload,
  message: string,
  conversationHistory: ChatMessage[],
): Promise<string> {
  const result = await callAi<{ reply: string }>({
    financialData: data,
    action: 'chat',
    message,
    conversationHistory,
  })
  return result.reply
}
