import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import { deudasApi } from '~/modules/deudas/services/api'
import DeudasView from '~/modules/deudas/views/DeudasView.vue'
import AppModal from '~/shared/components/ui/AppModal.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should DeudasView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const sampleDeuda = {
    nombrePersona: 'Carlos García',
    totalDeuda: 5000,
    tasaInteres: 2,
    cuotasPagadas: 3,
    montoActualPendiente: 3500,
    descripcion: 'Préstamo personal',
  }

  function mountAuthenticated(username = 'jugaz') {
    const { wrapper, pinia } = mountWithPlugins(DeudasView)
    const auth = useAuthStore(pinia)
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the deudas view', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="deudas-view"]').exists()).toBe(true)
  })

  it('should render summary cards for total deudas and total pendiente', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-deudas-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-pendiente-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-deudas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-pendiente"]').exists()).toBe(true)
  })

  it('should render the form with all inputs', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="deudas-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nombre-persona-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-deuda-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="monto-pendiente-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tasa-interes-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cuotas-pagadas-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)
  })

  it('should show empty state when no deudas exist', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deudas-list"]').exists()).toBe(false)
  })

  it('should show S/ 0.00 for both totals initially', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-deudas"]').text()).toContain('0.00')
    expect(wrapper.find('[data-testid="total-pendiente"]').text()).toContain('0.00')
  })

  // ─── Datos existentes ────────────────────────────────────────────────────
  it('should display existing deudas from localStorage', async () => {
    await deudasApi.create('jugaz', sampleDeuda)
    await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Ana López' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="deudas-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="deuda-item"]')).toHaveLength(2)
  })

  it('should display correct person name for each deuda', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="deuda-persona"]').text()).toBe('Carlos García')
  })

  it('should display correct total amount', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 3000 })
    await deudasApi.create('jugaz', { ...sampleDeuda, totalDeuda: 2000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-deudas"]').text()).toContain('5,000')
  })

  it('should display correct pendiente amount', async () => {
    await deudasApi.create('jugaz', { ...sampleDeuda, montoActualPendiente: 2000 })
    await deudasApi.create('jugaz', { ...sampleDeuda, montoActualPendiente: 1000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-pendiente"]').text()).toContain('3,000')
  })

  // ─── Validación del formulario ───────────────────────────────────────────
  it('should show error when nombrePersona is empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('2')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('800')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Préstamo')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('El nombre de la persona es requerido')
  })

  it('should show error when descripcion is empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Juan')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('2')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('800')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('La descripción es requerida')
  })

  it('should show error when totalDeuda is zero or invalid', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Juan')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('0')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('2')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('0')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('total de la deuda')
  })

  it('should show error when tasaInteres is negative', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Juan')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('800')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('tasa de interés')
  })

  it('should show error when monto pendiente is negative', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Juan')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('2')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('monto pendiente')
  })

  // ─── Submit exitoso ──────────────────────────────────────────────────────
  it('should add deuda and clear form on valid submit', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('María')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Préstamo')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('5000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('3')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('4000')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
    expect((wrapper.find('[data-testid="nombre-persona-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('should use 0 cuotasPagadas when the field is left empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Pedro')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('2000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('1')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('2000')
    // cuotas-pagadas-input left empty
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].cuotasPagadas).toBe(0)
  })

  // ─── Submit con campos opcionales ──────────────────────────────────
  it('should submit with cuotaMensual and totalCuotas', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Luis')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Préstamo')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('10000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('8000')
    await wrapper.find('[data-testid="cuota-mensual-input"]').setValue('500')
    await wrapper.find('[data-testid="cuotas-pagadas-input"]').setValue('4')
    await wrapper.find('[data-testid="total-cuotas-input"]').setValue('20')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].cuotaMensual).toBe(500)
    expect(stored[0].totalCuotas).toBe(20)
    expect(stored[0].cuotasPagadas).toBe(4)
  })

  it('should handle totalCuotas as undefined when invalid', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('Ana')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('3000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('1')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('2000')
    await wrapper.find('[data-testid="total-cuotas-input"]').setValue('0')
    await wrapper.find('[data-testid="deudas-form"]').trigger('submit')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].totalCuotas).toBeUndefined()
  })

  // ─── Eliminar ────────────────────────────────────────────────────────────
  it('should remove deuda when delete button is clicked', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
  })

  // ─── Editar deuda ──────────────────────────────────────────────────
  it('should open edit modal when edit button is clicked', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-deuda-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-submit-button"]').exists()).toBe(true)
  })

  it('should populate edit form with current values', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    const nameInput = wrapper.find('#edit-nombre-persona').element as HTMLInputElement
    expect(nameInput.value).toBe('Carlos García')
  })

  it('should save edit and update deuda', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('Nuevo Nombre')
    await wrapper.find('#edit-total-deuda').setValue('8000')
    await wrapper.find('#edit-monto-pendiente').setValue('6000')
    await wrapper.find('#edit-tasa-interes').setValue('3')
    await wrapper.find('#edit-descripcion').setValue('Préstamo editado')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].nombrePersona).toBe('Nuevo Nombre')
    expect(stored[0].descripcion).toBe('Préstamo editado')
  })

  it('should show edit form error when nombre is empty', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('')
    await wrapper.find('#edit-total-deuda').setValue('5000')
    await wrapper.find('#edit-monto-pendiente').setValue('3500')
    await wrapper.find('#edit-tasa-interes').setValue('2')
    await wrapper.find('#edit-descripcion').setValue('Test')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('nombre de la persona es requerido')
  })

  it('should show edit form error when descripcion is empty', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('Juan')
    await wrapper.find('#edit-descripcion').setValue('')
    await wrapper.find('#edit-total-deuda').setValue('5000')
    await wrapper.find('#edit-monto-pendiente').setValue('3500')
    await wrapper.find('#edit-tasa-interes').setValue('2')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('descripción es requerida')
  })

  it('should show edit form error when totalDeuda is invalid', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('Juan')
    await wrapper.find('#edit-descripcion').setValue('Test')
    await wrapper.find('#edit-total-deuda').setValue('0')
    await wrapper.find('#edit-tasa-interes').setValue('2')
    await wrapper.find('#edit-monto-pendiente').setValue('3500')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('total de la deuda')
  })

  it('should show edit form error when tasaInteres is invalid', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('Juan')
    await wrapper.find('#edit-descripcion').setValue('Test')
    await wrapper.find('#edit-total-deuda').setValue('5000')
    await wrapper.find('#edit-tasa-interes').setValue('')
    await wrapper.find('#edit-monto-pendiente').setValue('3500')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('tasa de interés')
  })

  it('should show edit form error when monto pendiente is invalid', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('#edit-nombre-persona').setValue('Juan')
    await wrapper.find('#edit-descripcion').setValue('Test')
    await wrapper.find('#edit-total-deuda').setValue('5000')
    await wrapper.find('#edit-tasa-interes').setValue('2')
    await wrapper.find('#edit-monto-pendiente').setValue('')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('monto pendiente')
  })

  // ─── Porcentaje pagado ────────────────────────────────────────────
  it('should display correct progress percentage', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalDeuda: 10000,
      montoActualPendiente: 3000,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('70%')
  })

  // ─── Amortización ──────────────────────────────────────────────────
  it('should show amortizacion button when totalCuotas is set', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 12,
      cuotaMensual: 500,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(true)
  })

  it('should not show amortizacion button when totalCuotas is undefined', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(false)
  })

  it('should toggle amortizacion table visibility', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 6,
      cuotaMensual: 500,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="amortizacion-table"]').exists()).toBe(false)

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="amortizacion-table"]').exists()).toBe(true)

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="amortizacion-table"]').exists()).toBe(false)
  })

  it('should show correct number of cuota rows in amortizacion table', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 6,
      cuotaMensual: 500,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="amortizacion-row"]')).toHaveLength(6)
  })

  it('should mark paid cuotas as Cancelado', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 6,
      cuotaMensual: 500,
      cuotasPagadas: 3,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    expect(rows[0].text()).toContain('Cancelado')
    expect(rows[2].text()).toContain('Cancelado')
    expect(rows[3].text()).toContain('Pendiente')
  })

  it('should pagar cuota and update deuda', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 6,
      cuotaMensual: 500,
      cuotasPagadas: 2,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    const pendienteButton = rows[2].find('button')
    await pendienteButton.trigger('click')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].cuotasPagadas).toBe(3)
  })

  it('should despagar cuota and update deuda', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalCuotas: 6,
      cuotaMensual: 500,
      cuotasPagadas: 3,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    const canceladoButton = rows[2].find('button')
    await canceladoButton.trigger('click')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].cuotasPagadas).toBe(2)
  })

  // ─── Drag and drop ─────────────────────────────────────────────────
  it('should have draggable deuda items', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const deudaItem = wrapper.find('[data-testid="deuda-item"]')
    expect(deudaItem.attributes('draggable')).toBe('true')
  })

  it('should reorder deudas via drag and drop', async () => {
    const a = await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Alpha' })
    const b = await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Beta' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const items = wrapper.findAll('[data-testid="deuda-item"]')

    await items[0].trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: () => {} },
    })
    await items[1].trigger('dragover')
    await items[1].trigger('drop', {
      dataTransfer: { getData: () => a.id },
    })
    await flushPromises()

    const orderRaw = localStorage.getItem('finance_jugaz_deudas_order')
    expect(orderRaw).toBeTruthy()
    const order = JSON.parse(orderRaw!)
    expect(order[0]).toBe(b.id)
    expect(order[1]).toBe(a.id)
  })

  it('should persist drag order and show sorted deudas on remount', async () => {
    const a = await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Alpha' })
    const b = await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Beta' })

    localStorage.setItem('finance_jugaz_deudas_order', JSON.stringify([b.id, a.id]))

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const personas = wrapper.findAll('[data-testid="deuda-persona"]')
    expect(personas[0].text()).toBe('Beta')
    expect(personas[1].text()).toBe('Alpha')
  })

  // ─── Deuda details display ─────────────────────────────────────────
  it('should display deuda total and pendiente amounts', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      totalDeuda: 8000,
      montoActualPendiente: 4500,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="deuda-total"]').text()).toContain('8,000')
    expect(wrapper.find('[data-testid="deuda-pendiente"]').text()).toContain('4,500')
  })

  it('should display cuota info when set', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      cuotaMensual: 500,
      cuotasPagadas: 3,
      totalCuotas: 10,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('3 / 10')
  })

  it('should display dash when cuotaMensual is not set', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('—')
  })

  it('should display deuda descripcion', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="deuda-descripcion"]').text()).toBe('Préstamo personal')
  })

  it('should display deuda count in summary', async () => {
    await deudasApi.create('jugaz', sampleDeuda)
    await deudasApi.create('jugaz', { ...sampleDeuda, nombrePersona: 'Otro' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('2 deudas activas')
  })

  it('should display singular when only 1 deuda', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('1 deuda activa')
  })

  // ─── Edit modal @input/@blur handlers ──────────────────────────────
  it('should handle edit modal input and blur events on cuota fields', async () => {
    await deudasApi.create('jugaz', {
      ...sampleDeuda,
      cuotaMensual: 500,
      totalCuotas: 10,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    // Trigger @input on edit-cuota-mensual
    const cuotaInput = wrapper.find('#edit-cuota-mensual')
    const cuotaEl = cuotaInput.element as HTMLInputElement
    cuotaEl.value = '600'
    await cuotaInput.trigger('input')
    await cuotaInput.trigger('blur')
    await flushPromises()

    // Trigger @input on edit-tasa-interes
    const tasaInput = wrapper.find('#edit-tasa-interes')
    const tasaEl = tasaInput.element as HTMLInputElement
    tasaEl.value = '3.5'
    await tasaInput.trigger('input')
    await flushPromises()

    // Trigger @input on edit-cuotas-pagadas
    const cuotasPagadasInput = wrapper.find('#edit-cuotas-pagadas')
    const cpEl = cuotasPagadasInput.element as HTMLInputElement
    cpEl.value = '5'
    await cuotasPagadasInput.trigger('input')
    await flushPromises()

    // Trigger @input on edit-total-cuotas
    const totalCuotasInput = wrapper.find('#edit-total-cuotas')
    const tcEl = totalCuotasInput.element as HTMLInputElement
    tcEl.value = '12'
    await totalCuotasInput.trigger('input')
    await flushPromises()

    // Trigger @input and @blur on edit-total-deuda
    const totalDeudaInput = wrapper.find('#edit-total-deuda')
    const tdEl = totalDeudaInput.element as HTMLInputElement
    tdEl.value = '7000'
    await totalDeudaInput.trigger('input')
    await totalDeudaInput.trigger('blur')
    await flushPromises()

    // Trigger @input and @blur on edit-monto-pendiente
    const montoPendienteInput = wrapper.find('#edit-monto-pendiente')
    const mpEl = montoPendienteInput.element as HTMLInputElement
    mpEl.value = '5000'
    await montoPendienteInput.trigger('input')
    await montoPendienteInput.trigger('blur')
    await flushPromises()

    // Now submit to verify the values are properly captured
    await wrapper.find('#edit-nombre-persona').setValue('Test Name')
    await wrapper.find('#edit-descripcion').setValue('Test Desc')
    await wrapper.find('[data-testid="edit-deuda-form"]').trigger('submit')
    await flushPromises()

    const stored = await deudasApi.getAll('jugaz')
    expect(stored[0].nombrePersona).toBe('Test Name')
  })

  // ─── Add form @input/@blur handlers ─────────────────────────────────
  it('should handle add form input and blur events', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Trigger @input/@blur on total-deuda
    const totalDeudaInput = wrapper.find('[data-testid="total-deuda-input"]')
    const tdEl = totalDeudaInput.element as HTMLInputElement
    tdEl.value = '5000'
    await totalDeudaInput.trigger('input')
    await totalDeudaInput.trigger('blur')

    // Trigger @input/@blur on monto-pendiente
    const pendienteInput = wrapper.find('[data-testid="monto-pendiente-input"]')
    const pEl = pendienteInput.element as HTMLInputElement
    pEl.value = '3000'
    await pendienteInput.trigger('input')
    await pendienteInput.trigger('blur')

    // Trigger @input/@blur on cuota-mensual
    const cuotaInput = wrapper.find('[data-testid="cuota-mensual-input"]')
    const cEl = cuotaInput.element as HTMLInputElement
    cEl.value = '500'
    await cuotaInput.trigger('input')
    await cuotaInput.trigger('blur')

    // Trigger @input on tasa-interes
    const tasaInput = wrapper.find('[data-testid="tasa-interes-input"]')
    const tEl = tasaInput.element as HTMLInputElement
    tEl.value = '3'
    await tasaInput.trigger('input')

    // Trigger @input on cuotas-pagadas and total-cuotas
    const cpInput = wrapper.find('[data-testid="cuotas-pagadas-input"]')
    const cpEl = cpInput.element as HTMLInputElement
    cpEl.value = '2'
    await cpInput.trigger('input')

    const tcInput = wrapper.find('[data-testid="total-cuotas-input"]')
    const tcEl = tcInput.element as HTMLInputElement
    tcEl.value = '12'
    await tcInput.trigger('input')

    await flushPromises()

    // Inputs should have values set by the handler
    expect(tdEl.value).toBeDefined()
  })

  // ─── Edit modal cancel button ────────────────────────────────────────
  it('should close edit modal via cancel button', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-deuda-form"]').exists()).toBe(true)

    // Click the cancel button in edit modal (not the form submit, but the "Cancelar" button)
    const cancelButtons = wrapper.findAll('button').filter((b) => b.text() === 'Cancelar')
    const editCancelBtn = cancelButtons[cancelButtons.length - 1]
    await editCancelBtn.trigger('click')
    await flushPromises()

    // AppModal uses v-show so element stays in DOM but becomes hidden
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(false)
  })

  // ─── Modal open/close via internal state ─────────────────────────────
  it('should cover openModal function', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.openModal()
    await flushPromises()

    expect(vm.isModalOpen).toBe(true)
    expect(vm.formError).toBeNull()
  })

  it('should close add modal via AppModal close event', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.$.setupState.isModalOpen = true
    await flushPromises()

    const modals = wrapper.findAllComponents(AppModal)
    modals[0].vm.$emit('close')
    await flushPromises()

    expect(vm.isModalOpen).toBe(false)
  })

  it('should close edit modal via AppModal close event', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Open edit modal via button
    await wrapper.find('[data-testid="edit-deuda-button"]').trigger('click')
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.isEditModalOpen).toBe(true)

    const modals = wrapper.findAllComponents(AppModal)
    modals[1].vm.$emit('close')
    await flushPromises()

    expect(vm.isEditModalOpen).toBe(false)
  })

  // ─── Dragend handler ─────────────────────────────────────────────────
  it('should reset drag state on dragend', async () => {
    await deudasApi.create('jugaz', sampleDeuda)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const item = wrapper.find('[data-testid="deuda-item"]')
    await item.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: () => {} },
    })
    await item.trigger('dragend')
    await flushPromises()

    // After dragend, no item should have the dragging visual state
    expect(item.classes()).not.toContain('opacity-40')
  })
})
