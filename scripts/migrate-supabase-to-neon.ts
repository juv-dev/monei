import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL ?? ''

function out(msg: string): void {
  process.stdout.write(`${msg}\n`)
}

function err(msg: string): void {
  process.stderr.write(`${msg}\n`)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  err('Faltan env vars: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!NEON_DATABASE_URL) {
  err('Falta env var: NEON_DATABASE_URL (postgres://... de Neon, role neondb_owner)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const sql = postgres(NEON_DATABASE_URL, { ssl: 'require' })

interface MigrationStep {
  table: string
  insertColumns: string[]
  map: (row: Record<string, unknown>) => unknown[]
}

const steps: MigrationStep[] = [
  {
    table: 'ingresos',
    insertColumns: ['id', 'user_id', 'monto', 'descripcion', 'created_at'],
    map: (row) => [
      String(row.id),
      String(row.user_id),
      Number(row.monto ?? 0),
      String(row.descripcion ?? ''),
      new Date(String(row.created_at)).toISOString(),
    ],
  },
  {
    table: 'gastos_presupuesto',
    insertColumns: ['id', 'user_id', 'monto', 'descripcion', 'categoria', 'created_at'],
    map: (row) => [
      String(row.id),
      String(row.user_id),
      Number(row.monto ?? 0),
      String(row.descripcion ?? ''),
      String(row.categoria ?? ''),
      new Date(String(row.created_at)).toISOString(),
    ],
  },
  {
    table: 'deudas',
    insertColumns: [
      'id',
      'user_id',
      'nombre_persona',
      'total_deuda',
      'tasa_interes',
      'cuotas_pagadas',
      'total_cuotas',
      'cuota_mensual',
      'monto_actual_pendiente',
      'descripcion',
      'created_at',
    ],
    map: (row) => [
      String(row.id),
      String(row.user_id),
      String(row.nombre_persona ?? ''),
      Number(row.total_deuda ?? 0),
      Number(row.tasa_interes ?? 0),
      Number(row.cuotas_pagadas ?? 0),
      row.total_cuotas != null ? Number(row.total_cuotas) : null,
      row.cuota_mensual != null ? Number(row.cuota_mensual) : null,
      Number(row.monto_actual_pendiente ?? 0),
      String(row.descripcion ?? ''),
      new Date(String(row.created_at)).toISOString(),
    ],
  },
  {
    table: 'tarjetas_credito',
    insertColumns: [
      'id',
      'user_id',
      'linea_total',
      'monto_deuda_actual',
      'pago_minimo',
      'saldo_total',
      'linea_total_usd',
      'monto_deuda_actual_usd',
      'pago_minimo_usd',
      'saldo_total_usd',
      'descripcion',
      'created_at',
    ],
    map: (row) => [
      String(row.id),
      String(row.user_id),
      Number(row.linea_total ?? 0),
      Number(row.monto_deuda_actual ?? 0),
      row.pago_minimo != null ? Number(row.pago_minimo) : null,
      row.saldo_total != null ? Number(row.saldo_total) : null,
      row.linea_total_usd != null ? Number(row.linea_total_usd) : null,
      row.monto_deuda_actual_usd != null ? Number(row.monto_deuda_actual_usd) : null,
      row.pago_minimo_usd != null ? Number(row.pago_minimo_usd) : null,
      row.saldo_total_usd != null ? Number(row.saldo_total_usd) : null,
      String(row.descripcion ?? ''),
      new Date(String(row.created_at)).toISOString(),
    ],
  },
  {
    table: 'tarjeta_pagos',
    insertColumns: ['id', 'user_id', 'tarjeta_id', 'monto', 'fecha', 'created_at'],
    map: (row) => [
      String(row.id),
      String(row.user_id),
      String(row.tarjeta_id),
      Number(row.monto ?? 0),
      String(row.fecha),
      new Date(String(row.created_at)).toISOString(),
    ],
  },
]

async function truncateAll(): Promise<void> {
  out('\n→ Limpiando tablas de Neon (TRUNCATE CASCADE)...')
  await sql.unsafe(
    'truncate table public.tarjeta_pagos, public.tarjetas_credito, public.deudas, public.gastos_presupuesto, public.ingresos restart identity cascade',
  )
  out('  ✓ Tablas limpias.')
}

async function migrateStep(step: MigrationStep): Promise<void> {
  out(`\n→ Migrando ${step.table} ...`)
  const { data, error } = await supabase.from(step.table).select('*')
  if (error) {
    err(`  ✗ Error leyendo ${step.table}: ${error.message}`)
    return
  }
  const rows = (data ?? []) as Record<string, unknown>[]
  if (rows.length === 0) {
    out(`  (vacío)`)
    return
  }

  let written = 0
  for (const row of rows) {
    try {
      const values = step.map(row)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      await sql.unsafe(
        `insert into public.${step.table} (${step.insertColumns.join(', ')}) values (${placeholders})`,
        values as never[],
      )
      written++
    } catch (e) {
      err(`  ✗ Error insertando row ${String(row.id)}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  out(`  ✓ ${written}/${rows.length} registros migrados a public.${step.table}`)
}

async function main(): Promise<void> {
  out('Iniciando migración Supabase → Neon')
  out(`Supabase URL: ${SUPABASE_URL}`)
  out(`Neon host: ${new URL(NEON_DATABASE_URL.replace('postgres://', 'http://')).host}`)
  try {
    await truncateAll()
    for (const step of steps) {
      await migrateStep(step)
    }
    out('\n✓ Migración completa.')
  } finally {
    await sql.end()
  }
}

main().catch((e: unknown) => {
  err(`Error fatal: ${e instanceof Error ? e.message : String(e)}`)
  void sql.end()
  process.exit(1)
})
