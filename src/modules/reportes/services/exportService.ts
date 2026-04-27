import type { Ingreso, GastoPresupuesto, Deuda, TarjetaCredito, TarjetaPago } from '~/shared/types'

export interface ExportData {
  ingresos: Ingreso[]
  gastos: GastoPresupuesto[]
  deudas: Deuda[]
  tarjetas: TarjetaCredito[]
  pagosTarjetas?: TarjetaPago[]
  usdRate: number
  userDisplayName?: string
}

const PEN = (n: number) => Number((n ?? 0).toFixed(2))

function sanitizeSheetName(raw: string, fallback: string, used: Set<string>): string {
  const cleaned = (raw || fallback).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || fallback
  let name = cleaned
  let i = 2
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${i++}`
    name = cleaned.slice(0, 31 - suffix.length) + suffix
  }
  used.add(name.toLowerCase())
  return name
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-PE')
}

export async function exportReporteToExcel(data: ExportData): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()

  const totalIngresos = data.ingresos.reduce((s, i) => s + i.monto, 0)
  const totalGastos = data.gastos.reduce((s, g) => s + g.monto, 0)
  const totalCuotasDeudas = data.deudas.reduce(
    (s, d) => s + (d.cuotaMensual ?? d.montoActualPendiente),
    0,
  )
  const totalPagoMesTarjetas = data.tarjetas.reduce(
    (s, t) => s + (t.montoDeudaActual ?? 0) + (t.montoDeudaActualUsd ?? 0) * data.usdRate,
    0,
  )
  const balance = totalIngresos - totalGastos - totalCuotasDeudas - totalPagoMesTarjetas

  const resumenRows: (string | number)[][] = [
    ['Reporte Monei'],
    ['Usuario', data.userDisplayName ?? ''],
    ['Generado', new Date().toLocaleString('es-PE')],
    ['Tipo de cambio USD→PEN', data.usdRate],
    [],
    ['Concepto', 'Monto (PEN)'],
    ['Total Ingresos', PEN(totalIngresos)],
    ['Total Egresos', PEN(totalGastos)],
    ['Cuotas mensuales de deudas', PEN(totalCuotasDeudas)],
    ['Pago del mes tarjetas', PEN(totalPagoMesTarjetas)],
    ['Balance neto', PEN(balance)],
    [],
    ['Totales acumulados'],
    ['Deuda total (préstamos)', PEN(data.deudas.reduce((s, d) => s + d.totalDeuda, 0))],
    ['Pendiente préstamos', PEN(data.deudas.reduce((s, d) => s + d.montoActualPendiente, 0))],
    [
      'Línea total tarjetas',
      PEN(
        data.tarjetas.reduce(
          (s, t) => s + t.lineaTotal + (t.lineaTotalUsd ?? 0) * data.usdRate,
          0,
        ),
      ),
    ],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, sanitizeSheetName('Resumen', 'Resumen', used))

  const ingresosRows = [
    ['Descripción', 'Monto (PEN)', 'Fecha'],
    ...data.ingresos.map((i) => [i.descripcion, PEN(i.monto), formatDate(i.createdAt)]),
    [],
    ['TOTAL', PEN(totalIngresos), ''],
  ]
  const wsIng = XLSX.utils.aoa_to_sheet(ingresosRows)
  wsIng['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsIng, sanitizeSheetName('Ingresos', 'Ingresos', used))

  const gastosRows = [
    ['Categoría', 'Descripción', 'Monto (PEN)', 'Fecha'],
    ...data.gastos.map((g) => [g.categoria, g.descripcion, PEN(g.monto), formatDate(g.createdAt)]),
    [],
    ['', 'TOTAL', PEN(totalGastos), ''],
  ]
  const wsGas = XLSX.utils.aoa_to_sheet(gastosRows)
  wsGas['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsGas, sanitizeSheetName('Egresos', 'Egresos', used))

  if (data.tarjetas.length > 0) {
    const tarjetasRows = [
      [
        'Descripción',
        'Línea PEN',
        'Pago del mes PEN',
        'Pago mínimo PEN',
        'Saldo total PEN',
        'Línea USD',
        'Pago del mes USD',
        'Pago mínimo USD',
        'Saldo total USD',
      ],
      ...data.tarjetas.map((t) => [
        t.descripcion,
        PEN(t.lineaTotal),
        PEN(t.montoDeudaActual),
        PEN(t.pagoMinimo ?? 0),
        PEN(t.saldoTotal ?? 0),
        PEN(t.lineaTotalUsd ?? 0),
        PEN(t.montoDeudaActualUsd ?? 0),
        PEN(t.pagoMinimoUsd ?? 0),
        PEN(t.saldoTotalUsd ?? 0),
      ]),
    ]
    const wsTar = XLSX.utils.aoa_to_sheet(tarjetasRows)
    wsTar['!cols'] = [
      { wch: 26 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsTar, sanitizeSheetName('Tarjetas', 'Tarjetas', used))
  }

  for (const d of data.deudas) {
    const sheetName = sanitizeSheetName(
      `Deuda ${d.nombrePersona || d.descripcion || d.id.slice(0, 6)}`,
      `Deuda ${d.id.slice(0, 6)}`,
      used,
    )
    const rows: (string | number)[][] = [
      ['Deuda', d.nombrePersona],
      ['Descripción', d.descripcion],
      ['Fecha alta', formatDate(d.createdAt)],
      [],
      ['Campo', 'Valor'],
      ['Total deuda (PEN)', PEN(d.totalDeuda)],
      ['Monto pendiente (PEN)', PEN(d.montoActualPendiente)],
      ['Cuota mensual (PEN)', PEN(d.cuotaMensual ?? 0)],
      ['Tasa de interés (%)', PEN(d.tasaInteres)],
      ['Cuotas pagadas', d.cuotasPagadas],
      ['Total de cuotas', d.totalCuotas ?? ''],
      ['Progreso', d.totalCuotas ? `${d.cuotasPagadas}/${d.totalCuotas}` : ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 24 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  // Raw sheets for round-trip import — always present, even when empty
  const ingRaw = data.ingresos.map((i) => [i.descripcion, PEN(i.monto), i.createdAt])
  const wsIngRaw = XLSX.utils.aoa_to_sheet([
    ['descripcion', 'monto', 'fecha_iso'],
    ...ingRaw,
  ])
  XLSX.utils.book_append_sheet(wb, wsIngRaw, '_ingresos')

  const egrRaw = data.gastos.map((g) => [g.categoria, g.descripcion, PEN(g.monto), g.createdAt])
  const wsEgrRaw = XLSX.utils.aoa_to_sheet([
    ['categoria', 'descripcion', 'monto', 'fecha_iso'],
    ...egrRaw,
  ])
  XLSX.utils.book_append_sheet(wb, wsEgrRaw, '_egresos')

  const tarRaw = data.tarjetas.map((t) => [
    t.descripcion,
    PEN(t.lineaTotal),
    PEN(t.montoDeudaActual),
    PEN(t.pagoMinimo ?? 0),
    PEN(t.saldoTotal ?? 0),
    PEN(t.lineaTotalUsd ?? 0),
    PEN(t.montoDeudaActualUsd ?? 0),
    PEN(t.pagoMinimoUsd ?? 0),
    PEN(t.saldoTotalUsd ?? 0),
  ])
  const wsTarRaw = XLSX.utils.aoa_to_sheet([
    [
      'descripcion',
      'lineaTotal',
      'montoDeudaActual',
      'pagoMinimo',
      'saldoTotal',
      'lineaTotalUsd',
      'montoDeudaActualUsd',
      'pagoMinimoUsd',
      'saldoTotalUsd',
    ],
    ...tarRaw,
  ])
  XLSX.utils.book_append_sheet(wb, wsTarRaw, '_tarjetas')

  const deuRaw = data.deudas.map((d) => [
    d.nombrePersona,
    d.descripcion,
    PEN(d.totalDeuda),
    PEN(d.montoActualPendiente),
    PEN(d.cuotaMensual ?? 0),
    PEN(d.tasaInteres),
    d.cuotasPagadas,
    d.totalCuotas ?? 0,
  ])
  const wsDeuRaw = XLSX.utils.aoa_to_sheet([
    [
      'nombrePersona',
      'descripcion',
      'totalDeuda',
      'montoActualPendiente',
      'cuotaMensual',
      'tasaInteres',
      'cuotasPagadas',
      'totalCuotas',
    ],
    ...deuRaw,
  ])
  XLSX.utils.book_append_sheet(wb, wsDeuRaw, '_deudas')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `monei-reporte-${today}.xlsx`)
}
