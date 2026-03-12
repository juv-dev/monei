import type {
  Ingreso,
  NuevoIngreso,
  GastoPresupuesto,
  NuevoGasto,
  Deuda,
  NuevaDeuda,
  TarjetaCredito,
  NuevaTarjeta,
  TarjetaPago,
  NuevoTarjetaPago,
} from '~/shared/types'

// ─── Database row types ──────────────────────────────────────────────────────

interface DbIngreso {
  id: string
  monto: number
  descripcion: string
  user_id: string
  created_at: string
}

interface DbGasto {
  id: string
  monto: number
  descripcion: string
  categoria: string
  user_id: string
  created_at: string
}

interface DbDeuda {
  id: string
  nombre_persona: string
  total_deuda: number
  tasa_interes: number
  cuotas_pagadas: number
  total_cuotas: number | null
  cuota_mensual: number | null
  monto_actual_pendiente: number
  descripcion: string
  user_id: string
  created_at: string
}

interface DbTarjeta {
  id: string
  linea_total: number
  monto_deuda_actual: number
  pago_minimo: number | null
  saldo_total: number | null
  descripcion: string
  user_id: string
  created_at: string
}

interface DbPago {
  id: string
  tarjeta_id: string
  monto: number
  fecha: string
  user_id: string
  created_at: string
}

// ─── DB → Frontend ───────────────────────────────────────────────────────────

export function mapDbIngreso(row: DbIngreso): Ingreso {
  return {
    id: row.id,
    monto: Number(row.monto),
    descripcion: row.descripcion,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

export function mapDbGasto(row: DbGasto): GastoPresupuesto {
  return {
    id: row.id,
    monto: Number(row.monto),
    descripcion: row.descripcion,
    categoria: row.categoria,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

export function mapDbDeuda(row: DbDeuda): Deuda {
  return {
    id: row.id,
    nombrePersona: row.nombre_persona,
    totalDeuda: Number(row.total_deuda),
    tasaInteres: Number(row.tasa_interes),
    cuotasPagadas: row.cuotas_pagadas,
    totalCuotas: row.total_cuotas ?? undefined,
    cuotaMensual: row.cuota_mensual != null ? Number(row.cuota_mensual) : undefined,
    montoActualPendiente: Number(row.monto_actual_pendiente),
    descripcion: row.descripcion,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

export function mapDbTarjeta(row: DbTarjeta): TarjetaCredito {
  return {
    id: row.id,
    lineaTotal: Number(row.linea_total),
    montoDeudaActual: Number(row.monto_deuda_actual),
    pagoMinimo: row.pago_minimo != null ? Number(row.pago_minimo) : undefined,
    saldoTotal: row.saldo_total != null ? Number(row.saldo_total) : undefined,
    descripcion: row.descripcion,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

export function mapDbPago(row: DbPago): TarjetaPago {
  return {
    id: row.id,
    tarjetaId: row.tarjeta_id,
    monto: Number(row.monto),
    fecha: row.fecha,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

// ─── Frontend → DB insert ────────────────────────────────────────────────────

export function mapIngresoToDb(data: NuevoIngreso, userId: string) {
  return { monto: data.monto, descripcion: data.descripcion, user_id: userId }
}

export function mapGastoToDb(data: NuevoGasto, userId: string) {
  return {
    monto: data.monto,
    descripcion: data.descripcion,
    categoria: data.categoria,
    user_id: userId,
  }
}

export function mapDeudaToDb(data: NuevaDeuda, userId: string) {
  return {
    nombre_persona: data.nombrePersona,
    total_deuda: data.totalDeuda,
    tasa_interes: data.tasaInteres,
    cuotas_pagadas: data.cuotasPagadas,
    total_cuotas: data.totalCuotas ?? null,
    cuota_mensual: data.cuotaMensual ?? null,
    monto_actual_pendiente: data.montoActualPendiente,
    descripcion: data.descripcion,
    user_id: userId,
  }
}

export function mapTarjetaToDb(data: NuevaTarjeta, userId: string) {
  return {
    linea_total: data.lineaTotal,
    monto_deuda_actual: data.montoDeudaActual,
    pago_minimo: data.pagoMinimo ?? null,
    saldo_total: data.saldoTotal ?? null,
    descripcion: data.descripcion,
    user_id: userId,
  }
}

export function mapPagoToDb(data: NuevoTarjetaPago, userId: string) {
  return {
    tarjeta_id: data.tarjetaId,
    monto: data.monto,
    fecha: data.fecha,
    user_id: userId,
  }
}
