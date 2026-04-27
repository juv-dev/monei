import type { NuevoIngreso, NuevoGasto, NuevaDeuda, NuevaTarjeta } from '~/shared/types'

export const sampleIngresos: NuevoIngreso[] = [
  { monto: 5200, descripcion: 'Sueldo mensual' },
  { monto: 1200, descripcion: 'Proyecto freelance — Landing page' },
  { monto: 450, descripcion: 'Clases de programación particulares' },
  { monto: 300, descripcion: 'Venta de curso online' },
  { monto: 180, descripcion: 'Reembolso de gastos empresa' },
]

export const sampleGastos: NuevoGasto[] = [
  // Vivienda
  { monto: 1400, descripcion: 'Alquiler departamento', categoria: 'Vivienda' },
  { monto: 120, descripcion: 'Servicio de luz y agua', categoria: 'Vivienda' },
  { monto: 85, descripcion: 'Internet fibra óptica', categoria: 'Vivienda' },

  // Alimentación
  { monto: 680, descripcion: 'Supermercado Wong', categoria: 'Alimentación' },
  { monto: 220, descripcion: 'Delivery Rappi / PedidosYa', categoria: 'Alimentación' },
  { monto: 95, descripcion: 'Cafetería y snacks trabajo', categoria: 'Alimentación' },

  // Transporte
  { monto: 180, descripcion: 'Gasolina del mes', categoria: 'Transporte' },
  { monto: 90, descripcion: 'Estacionamiento y peajes', categoria: 'Transporte' },

  // Servicios
  { monto: 45, descripcion: 'Plan celular Claro', categoria: 'Servicios' },
  { monto: 38, descripcion: 'Netflix + Spotify', categoria: 'Servicios' },

  // Salud
  { monto: 150, descripcion: 'Gym Smartfit mensual', categoria: 'Salud' },
  { monto: 80, descripcion: 'Consulta médica particular', categoria: 'Salud' },

  // Personal
  { monto: 320, descripcion: 'Salidas y entretenimiento', categoria: 'Personal' },
  { monto: 190, descripcion: 'Ropa y calzado', categoria: 'Personal' },
]

export const sampleDeudas: NuevaDeuda[] = [
  {
    nombrePersona: 'BCP',
    totalDeuda: 18000,
    tasaInteres: 19.5,
    cuotasPagadas: 8,
    totalCuotas: 36,
    cuotaMensual: 680,
    montoActualPendiente: 12760,
    descripcion: 'Préstamo personal emprendimiento',
  },
  {
    nombrePersona: 'Interbank',
    totalDeuda: 4500,
    tasaInteres: 15,
    cuotasPagadas: 5,
    totalCuotas: 18,
    cuotaMensual: 285,
    montoActualPendiente: 3420,
    descripcion: 'Compra de laptop y equipo',
  },
  {
    nombrePersona: 'Carlos (amigo)',
    totalDeuda: 1500,
    tasaInteres: 0,
    cuotasPagadas: 3,
    totalCuotas: 6,
    cuotaMensual: 250,
    montoActualPendiente: 750,
    descripcion: 'Préstamo para mudanza',
  },
]

export const sampleTarjetas: NuevaTarjeta[] = [
  {
    lineaTotal: 10000,
    montoDeudaActual: 2850,
    pagoMinimo: 200,
    saldoTotal: 3600,
    descripcion: 'Visa BCP Clásica',
  },
  {
    lineaTotal: 6000,
    montoDeudaActual: 940,
    pagoMinimo: 65,
    saldoTotal: 940,
    descripcion: 'Mastercard Interbank Digital',
  },
  {
    lineaTotal: 3000,
    lineaTotalUsd: 800,
    montoDeudaActual: 0,
    montoDeudaActualUsd: 320,
    pagoMinimo: 0,
    pagoMinimoUsd: 25,
    saldoTotal: 0,
    saldoTotalUsd: 320,
    descripcion: 'Visa BBVA Dólares',
  },
]
