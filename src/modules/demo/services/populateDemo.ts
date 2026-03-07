import { ingresosApi } from '~/modules/ingresos/services/api'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import { deudasApi } from '~/modules/deudas/services/api'
import { tarjetasApi } from '~/modules/tarjetas/services/api'
import { sampleIngresos, sampleGastos, sampleDeudas, sampleTarjetas } from '../data/sampleData'

const DEMO_USER_ID = 'demo'
const POPULATED_KEY = `finance_${DEMO_USER_ID}_demo_populated`

export async function populateDemoData(): Promise<void> {
  if (localStorage.getItem(POPULATED_KEY)) return

  for (const ingreso of sampleIngresos) {
    await ingresosApi.create(DEMO_USER_ID, ingreso)
  }
  for (const gasto of sampleGastos) {
    await presupuestoApi.create(DEMO_USER_ID, gasto)
  }
  for (const deuda of sampleDeudas) {
    await deudasApi.create(DEMO_USER_ID, deuda)
  }
  for (const tarjeta of sampleTarjetas) {
    await tarjetasApi.create(DEMO_USER_ID, tarjeta)
  }

  localStorage.setItem(POPULATED_KEY, '1')
}
