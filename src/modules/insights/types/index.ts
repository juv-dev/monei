export type ScoreLabel = 'Crítico' | 'Regular' | 'Bueno' | 'Excelente'

export interface FinancialScore {
  total: number
  savingsRatio: number
  creditUtilization: number
  expenseControl: number
  debtManagement: number
  label: ScoreLabel
  color: string
}

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface InsightAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
}

export interface CategoryAnalysis {
  nombre: string
  monto: number
  porcentaje: number
}

export interface DebtProjection {
  deudaId: string
  nombrePersona: string
  mesesRestantes: number
  fechaEstimada: string
  totalIntereses: number
  montoActualPendiente: number
}

export type CreditStatus = 'bueno' | 'moderado' | 'alto' | 'critico'

export interface CreditHealth {
  tarjetaId: string
  descripcion: string
  utilizacion: number
  lineaTotal: number
  deudaActual: number
  status: CreditStatus
}

export type TipCategory = 'ahorro' | 'deuda' | 'gasto' | 'credito'

export interface PersonalizedTip {
  id: string
  text: string
  category: TipCategory
}
