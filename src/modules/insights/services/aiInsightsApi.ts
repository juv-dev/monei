import { supabase } from '~/config/supabase'

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

export async function fetchAiInsights(data: FinancialSummaryPayload): Promise<AiAnalysis> {
  const { data: result, error } = await supabase.functions.invoke('ai-insights', {
    body: { financialData: data, action: 'analyze' },
  })
  if (error) throw error
  return result.analysis as AiAnalysis
}

export async function sendAiChat(
  data: FinancialSummaryPayload,
  message: string,
  conversationHistory: ChatMessage[],
): Promise<string> {
  const { data: result, error } = await supabase.functions.invoke('ai-insights', {
    body: {
      financialData: data,
      action: 'chat',
      message,
      conversationHistory,
    },
  })
  if (error) throw error
  return result.reply as string
}
