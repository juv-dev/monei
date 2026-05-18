export interface User {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  provider: 'google' | 'github' | 'email' | 'demo'
}

export interface Ingreso {
  id: string
  monto: number
  descripcion: string
  userId: string
  createdAt: string
}

export type NuevoIngreso = Pick<Ingreso, 'monto' | 'descripcion'>

export interface GastoPresupuesto {
  id: string
  monto: number
  descripcion: string
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

export interface Deuda {
  id: string
  nombrePersona: string
  totalDeuda: number
  tasaInteres: number
  cuotasPagadas: number
  totalCuotas?: number
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

export interface TarjetaCredito {
  id: string
  lineaTotal: number
  montoDeudaActual: number
  pagoMinimo?: number
  saldoTotal?: number
  lineaTotalUsd?: number
  montoDeudaActualUsd?: number
  pagoMinimoUsd?: number
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

export interface TarjetaPago {
  id: string
  tarjetaId: string
  monto: number
  fecha: string
  userId: string
  createdAt: string
}

export type NuevoTarjetaPago = Pick<TarjetaPago, 'tarjetaId' | 'monto' | 'fecha'>

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
