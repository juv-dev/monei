import { Workbook } from 'exceljs'
import type { Worksheet } from 'exceljs'
import type { NuevoIngreso, NuevoGasto, NuevaTarjeta, NuevaDeuda } from '~/shared/types'

export interface ImportData {
  ingresos: NuevoIngreso[]
  gastos: NuevoGasto[]
  tarjetas: NuevaTarjeta[]
  deudas: NuevaDeuda[]
}

function sheetToJson(ws: Worksheet): Record<string, unknown>[] {
  const headers: Record<number, string> = {}
  ws.getRow(1).eachCell((cell, col) => {
    headers[col] = String(cell.value ?? '')
  })

  const result: Record<string, unknown>[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Record<string, unknown> = {}
    Object.entries(headers).forEach(([col, key]) => {
      obj[key] = row.getCell(Number(col)).value
    })
    result.push(obj)
  })

  return result
}

export async function parseImportFile(file: File): Promise<ImportData> {
  const wb = new Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const required = ['_ingresos', '_egresos', '_tarjetas', '_deudas']
  const missing = required.filter((s) => !wb.getWorksheet(s))
  if (missing.length > 0) {
    throw new Error(
      `Archivo inválido — hojas faltantes: ${missing.join(', ')}. Usá un reporte exportado desde Monei.`,
    )
  }

  type RawRow = Record<string, unknown>
  const str = (v: unknown): string => (v != null ? String(v) : '')
  const num = (v: unknown): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const numPos = (v: unknown): number | undefined => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

  const ingRows = sheetToJson(wb.getWorksheet('_ingresos')!) as RawRow[]
  const ingresos: NuevoIngreso[] = ingRows
    .filter((r) => str(r['descripcion']) && r['monto'] != null)
    .map((r) => ({ descripcion: str(r['descripcion']), monto: num(r['monto']) }))

  const egrRows = sheetToJson(wb.getWorksheet('_egresos')!) as RawRow[]
  const gastos: NuevoGasto[] = egrRows
    .filter((r) => str(r['descripcion']) && r['monto'] != null && str(r['categoria']))
    .map((r) => ({
      categoria: str(r['categoria']),
      descripcion: str(r['descripcion']),
      monto: num(r['monto']),
    }))

  const tarRows = sheetToJson(wb.getWorksheet('_tarjetas')!) as RawRow[]
  const tarjetas: NuevaTarjeta[] = tarRows
    .filter((r) => str(r['descripcion']))
    .map((r) => ({
      descripcion: str(r['descripcion']),
      lineaTotal: num(r['lineaTotal']),
      montoDeudaActual: num(r['montoDeudaActual']),
      pagoMinimo: numPos(r['pagoMinimo']),
      saldoTotal: numPos(r['saldoTotal']),
      lineaTotalUsd: numPos(r['lineaTotalUsd']),
      montoDeudaActualUsd: numPos(r['montoDeudaActualUsd']),
      pagoMinimoUsd: numPos(r['pagoMinimoUsd']),
      saldoTotalUsd: numPos(r['saldoTotalUsd']),
    }))

  const deuRows = sheetToJson(wb.getWorksheet('_deudas')!) as RawRow[]
  const deudas: NuevaDeuda[] = deuRows
    .filter((r) => str(r['nombrePersona']) || str(r['descripcion']))
    .map((r) => ({
      nombrePersona: str(r['nombrePersona']),
      descripcion: str(r['descripcion']),
      totalDeuda: num(r['totalDeuda']),
      montoActualPendiente: num(r['montoActualPendiente']),
      cuotaMensual: numPos(r['cuotaMensual']),
      tasaInteres: num(r['tasaInteres']),
      cuotasPagadas: num(r['cuotasPagadas']),
      totalCuotas: numPos(r['totalCuotas']),
    }))

  return { ingresos, gastos, tarjetas, deudas }
}
