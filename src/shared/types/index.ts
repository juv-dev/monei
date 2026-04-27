// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  provider: 'google' | 'github' | 'email' | 'demo'
}

// ─── Ingresos ─────────────────────────────────────────────────────────────────
export interface Ingreso {
  id: string
  monto: number
  descripcion: string
  userId: string
  createdAt: string
}

export type NuevoIngreso = Pick<Ingreso, 'monto' | 'descripcion'>

// ─── Presupuesto (Gastos) ─────────────────────────────────────────────────────
export interface GastoPresupuesto {
  id: string
  monto: number
  descripcion: string
  /** Sección/categoría del gasto (ej: "Trabajo", "Casa", "Personal") */
  categoria: string
  userId: string
  createdAt: string
}

export type NuevoGasto = Pick<GastoPresupuesto, 'monto' | 'descripcion' | 'categoria'>

export interface CategoriaResumen {
  nombre: string
  items: GastoPresupuesto[]
  subtotal: number
}

// ─── Deudas ───────────────────────────────────────────────────────────────────
export interface Deuda {
  id: string
  nombrePersona: string
  totalDeuda: number
  tasaInteres: number
  cuotasPagadas: number
  /** Total de cuotas pactadas (opcional para datos legados) */
  totalCuotas?: number
  /** Monto fijo mensual (opcional para datos legados) */
  cuotaMensual?: number
  montoActualPendiente: number
  descripcion: string
  userId: string
  createdAt: string
}

export type NuevaDeuda = Pick<
  Deuda,
  | 'nombrePersona'
  | 'totalDeuda'
  | 'tasaInteres'
  | 'cuotasPagadas'
  | 'totalCuotas'
  | 'cuotaMensual'
  | 'montoActualPendiente'
  | 'descripcion'
>

// ─── Tarjetas de Crédito ──────────────────────────────────────────────────────
export interface TarjetaCredito {
  id: string
  lineaTotal: number
  /** Pago del mes actual */
  montoDeudaActual: number
  /** Pago mínimo requerido. Opcional. */
  pagoMinimo?: number
  /** Saldo total acumulado (todas las cuotas pendientes). Opcional para datos legados. */
  saldoTotal?: number
  // Dual-currency: los bancos peruanos suelen dar línea separada en USD sobre la misma tarjeta.
  /** Línea total en dólares. Opcional. */
  lineaTotalUsd?: number
  /** Pago del mes actual en dólares. Opcional. */
  montoDeudaActualUsd?: number
  /** Pago mínimo en dólares. Opcional. */
  pagoMinimoUsd?: number
  /** Saldo total acumulado en dólares. Opcional. */
  saldoTotalUsd?: number
  descripcion: string
  userId: string
  createdAt: string
}

export type NuevaTarjeta = Pick<
  TarjetaCredito,
  | 'lineaTotal'
  | 'montoDeudaActual'
  | 'pagoMinimo'
  | 'saldoTotal'
  | 'lineaTotalUsd'
  | 'montoDeudaActualUsd'
  | 'pagoMinimoUsd'
  | 'saldoTotalUsd'
  | 'descripcion'
>

// ─── Pagos de Tarjetas ───────────────────────────────────────────────────────
export interface TarjetaPago {
  id: string
  tarjetaId: string
  monto: number
  fecha: string
  userId: string
  createdAt: string
}

export type NuevoTarjetaPago = Pick<TarjetaPago, 'tarjetaId' | 'monto' | 'fecha'>

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DescripcionResumen {
  tipo: 'Ingreso' | 'Gasto' | 'Deuda' | 'Tarjeta'
  descripcion: string
  monto: number
}

export interface ResumenGeneral {
  totalIngresos: number
  totalGastado: number
  totalDeudas: number
  totalPendienteDeudas: number
  totalCuotaMensualDeudas: number
  totalTarjetas: number
  balance: number
}
