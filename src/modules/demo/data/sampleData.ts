import type { NuevoIngreso, NuevoGasto, NuevaDeuda, NuevaTarjeta } from '~/shared/types'

export const sampleIngresos: NuevoIngreso[] = [
  { monto: 4500, descripcion: 'Sueldo mensual' },
  { monto: 800, descripcion: 'Freelance diseño web' },
  { monto: 200, descripcion: 'Venta de artículos usados' },
  { monto: 350, descripcion: 'Clases particulares' },
]

export const sampleGastos: NuevoGasto[] = [
  { monto: 1200, descripcion: 'Alquiler departamento', categoria: 'Vivienda' },
  { monto: 600, descripcion: 'Supermercado semanal', categoria: 'Alimentación' },
  { monto: 150, descripcion: 'Internet y cable', categoria: 'Servicios' },
  { monto: 80, descripcion: 'Plan celular', categoria: 'Servicios' },
  { monto: 200, descripcion: 'Gasolina', categoria: 'Transporte' },
  { monto: 120, descripcion: 'Uber y taxis', categoria: 'Transporte' },
  { monto: 350, descripcion: 'Salidas y entretenimiento', categoria: 'Personal' },
  { monto: 100, descripcion: 'Gym mensual', categoria: 'Salud' },
  { monto: 250, descripcion: 'Ropa y calzado', categoria: 'Personal' },
  { monto: 80, descripcion: 'Streaming (Netflix, Spotify)', categoria: 'Servicios' },
  { monto: 150, descripcion: 'Comida delivery', categoria: 'Alimentación' },
]

export const sampleDeudas: NuevaDeuda[] = [
  {
    nombrePersona: 'Banco Nacional',
    totalDeuda: 15000,
    tasaInteres: 18,
    cuotasPagadas: 6,
    totalCuotas: 24,
    cuotaMensual: 750,
    montoActualPendiente: 11250,
    descripcion: 'Préstamo personal',
  },
  {
    nombrePersona: 'Carlos (amigo)',
    totalDeuda: 2000,
    tasaInteres: 0,
    cuotasPagadas: 2,
    totalCuotas: 10,
    cuotaMensual: 200,
    montoActualPendiente: 1600,
    descripcion: 'Préstamo para laptop',
  },
  {
    nombrePersona: 'Cooperativa Sol',
    totalDeuda: 5000,
    tasaInteres: 12,
    cuotasPagadas: 10,
    totalCuotas: 36,
    cuotaMensual: 180,
    montoActualPendiente: 3200,
    descripcion: 'Préstamo de estudios',
  },
]

export const sampleTarjetas: NuevaTarjeta[] = [
  {
    lineaTotal: 8000,
    montoDeudaActual: 2400,
    pagoMinimo: 180,
    saldoTotal: 3200,
    descripcion: 'Visa Banco Nacional',
  },
  {
    lineaTotal: 5000,
    montoDeudaActual: 800,
    pagoMinimo: 60,
    saldoTotal: 800,
    descripcion: 'Mastercard Digital',
  },
]
