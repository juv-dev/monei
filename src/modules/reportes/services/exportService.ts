import { Workbook } from 'exceljs'
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

type Row = (string | number)[]

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

function addSheet(wb: Workbook, name: string, rows: Row[], colWidths: number[]): void {
  const ws = wb.addWorksheet(name)
  ws.addRows(rows)
  colWidths.forEach((width, i) => {
    ws.getColumn(i + 1).width = width
  })
}

export async function exportReporteToExcel(data: ExportData): Promise<void> {
  const wb = new Workbook()
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

  const resumenRows: Row[] = [
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
  addSheet(wb, sanitizeSheetName('Resumen', 'Resumen', used), resumenRows, [32, 18])

  const ingresosRows: Row[] = [
    ['Descripción', 'Monto (PEN)', 'Fecha'],
    ...data.ingresos.map((i) => [i.descripcion, PEN(i.monto), formatDate(i.createdAt)]),
    [],
    ['TOTAL', PEN(totalIngresos), ''],
  ]
  addSheet(wb, sanitizeSheetName('Ingresos', 'Ingresos', used), ingresosRows, [40, 14, 14])

  const gastosRows: Row[] = [
    ['Categoría', 'Descripción', 'Monto (PEN)', 'Fecha'],
    ...data.gastos.map((g) => [g.categoria, g.descripcion, PEN(g.monto), formatDate(g.createdAt)]),
    [],
    ['', 'TOTAL', PEN(totalGastos), ''],
  ]
  addSheet(wb, sanitizeSheetName('Egresos', 'Egresos', used), gastosRows, [18, 36, 14, 14])

  if (data.tarjetas.length > 0) {
    const tarjetasRows: Row[] = [
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
    addSheet(wb, sanitizeSheetName('Tarjetas', 'Tarjetas', used), tarjetasRows, [
      26, 14, 16, 16, 16, 12, 14, 14, 14,
    ])
  }

  for (const d of data.deudas) {
    const sheetName = sanitizeSheetName(
      `Deuda ${d.nombrePersona || d.descripcion || d.id.slice(0, 6)}`,
      `Deuda ${d.id.slice(0, 6)}`,
      used,
    )
    const rows: Row[] = [
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
    addSheet(wb, sheetName, rows, [24, 28])
  }

  addSheet(
    wb,
    '_ingresos',
    [
      ['descripcion', 'monto', 'fecha_iso'],
      ...data.ingresos.map((i) => [i.descripcion, PEN(i.monto), i.createdAt]),
    ],
    [],
  )

  addSheet(
    wb,
    '_egresos',
    [
      ['categoria', 'descripcion', 'monto', 'fecha_iso'],
      ...data.gastos.map((g) => [g.categoria, g.descripcion, PEN(g.monto), g.createdAt]),
    ],
    [],
  )

  addSheet(
    wb,
    '_tarjetas',
    [
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
    ],
    [],
  )

  addSheet(
    wb,
    '_deudas',
    [
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
      ...data.deudas.map((d) => [
        d.nombrePersona,
        d.descripcion,
        PEN(d.totalDeuda),
        PEN(d.montoActualPendiente),
        PEN(d.cuotaMensual ?? 0),
        PEN(d.tasaInteres),
        d.cuotasPagadas,
        d.totalCuotas ?? 0,
      ]),
    ],
    [],
  )

  const today = new Date().toISOString().slice(0, 10)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `monei-reporte-${today}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
