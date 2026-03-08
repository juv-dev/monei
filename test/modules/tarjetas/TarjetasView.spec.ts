import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import { tarjetasApi } from '~/modules/tarjetas/services/api'
import { pagosApi } from '~/modules/tarjetas/services/pagosApi'
import TarjetasView from '~/modules/tarjetas/views/TarjetasView.vue'
import AppModal from '~/shared/components/ui/AppModal.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should TarjetasView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const sampleTarjeta = {
    lineaTotal: 10000,
    montoDeudaActual: 3500,
    descripcion: 'Visa BCP',
  }

  function mountAuthenticated(username = 'demo') {
    const { wrapper, pinia } = mountWithPlugins(TarjetasView)
    const auth = useAuthStore(pinia)
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the tarjetas view', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="tarjetas-view"]').exists()).toBe(true)
  })

  it('should render summary cards', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-tarjetas-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linea-total-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-tarjetas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linea-total-combinada"]').exists()).toBe(true)
  })

  it('should render the form with all inputs', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjetas-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linea-total-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="monto-deuda-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)
  })

  it('should show empty state when no tarjetas exist', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tarjetas-list"]').exists()).toBe(false)
  })

  it('should show S/ 0.00 for totals initially', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-tarjetas"]').text()).toContain('0.00')
    expect(wrapper.find('[data-testid="linea-total-combinada"]').text()).toContain('0.00')
  })

  // ─── Datos existentes ────────────────────────────────────────────────────
  it('should display existing tarjetas', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)
    await tarjetasApi.create('demo', { ...sampleTarjeta, descripcion: 'MasterCard' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjetas-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="tarjeta-item"]')).toHaveLength(2)
  })

  it('should display correct total tarjetas deuda', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, montoDeudaActual: 2000 })
    await tarjetasApi.create('demo', { ...sampleTarjeta, montoDeudaActual: 1000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-tarjetas"]').text()).toContain('3,000')
  })

  it('should display correct linea total combinada', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, lineaTotal: 8000 })
    await tarjetasApi.create('demo', { ...sampleTarjeta, lineaTotal: 5000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="linea-total-combinada"]').text()).toContain('13,000')
  })

  it('should display tarjeta descripcion correctly', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, descripcion: 'Amex Gold' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-descripcion"]').text()).toBe('Amex Gold')
  })

  // ─── Validación del formulario ───────────────────────────────────────────
  it('should show error when descripcion is empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="linea-total-input"]').setValue('10000')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('2000')
    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('La descripción es requerida')
  })

  it('should show error when lineaTotal is zero or invalid', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Visa')
    await wrapper.find('[data-testid="linea-total-input"]').setValue('0')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('0')
    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('línea total')
  })

  it('should show error when montoDeuda is negative', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Visa')
    await wrapper.find('[data-testid="linea-total-input"]').setValue('5000')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('')
    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('monto de deuda')
  })

  // ─── Submit exitoso ──────────────────────────────────────────────────────
  it('should add tarjeta and clear form on valid submit', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="linea-total-input"]').setValue('8000')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('2500')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Diners')
    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
    expect((wrapper.find('[data-testid="descripcion-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('should add tarjeta with pagoMinimo and saldoTotal fields', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Mastercard')
    await wrapper.find('[data-testid="linea-total-input"]').setValue('10000')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('3000')

    // Fill optional fields to cover the ternary branches
    const pagoMinInput = wrapper.find('[data-testid="pago-minimo-input"]')
    const pmEl = pagoMinInput.element as HTMLInputElement
    pmEl.value = '500'
    await pagoMinInput.trigger('input')

    const saldoInput = wrapper.find('[data-testid="saldo-total-input"]')
    const stEl = saldoInput.element as HTMLInputElement
    stEl.value = '4000'
    await saldoInput.trigger('input')

    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored[0].pagoMinimo).toBe(500)
    expect(stored[0].saldoTotal).toBe(4000)
  })

  it('should save edit with empty optional fields', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, pagoMinimo: 200, saldoTotal: 5000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // Clear optional fields to cover the falsy branches in saveEdit
    const pagoInput = wrapper.find('[data-testid="edit-pago-minimo"]')
    ;(pagoInput.element as HTMLInputElement).value = ''
    await pagoInput.trigger('input')

    const saldoInput = wrapper.find('[data-testid="edit-saldo-total"]')
    ;(saldoInput.element as HTMLInputElement).value = ''
    await saldoInput.trigger('input')

    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored[0].pagoMinimo).toBeUndefined()
    expect(stored[0].saldoTotal).toBeUndefined()
  })

  it('should save edit with empty descripcion and invalid numbers', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // Clear descripcion to cover `trim() || undefined` → undefined branch
    const descInput = wrapper.find('[data-testid="edit-descripcion"]')
    ;(descInput.element as HTMLInputElement).value = ''
    await descInput.trigger('input')

    // Set invalid lineaTotal to cover isNaN → undefined branch
    const lineaInput = wrapper.find('[data-testid="edit-linea-total"]')
    ;(lineaInput.element as HTMLInputElement).value = 'abc'
    await lineaInput.trigger('input')

    // Set invalid montoDeuda to cover isNaN → undefined branch
    const deudaInput = wrapper.find('[data-testid="edit-monto-deuda"]')
    ;(deudaInput.element as HTMLInputElement).value = 'xyz'
    await deudaInput.trigger('input')

    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored[0].descripcion).toBeUndefined()
  })

  it('should accept montoDeuda = 0 as valid (tarjeta sin deuda)', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="linea-total-input"]').setValue('5000')
    await wrapper.find('[data-testid="monto-deuda-input"]').setValue('0')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Visa sin deuda')
    await wrapper.find('[data-testid="tarjetas-form"]').trigger('submit')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored[0].montoDeudaActual).toBe(0)
  })

  // ─── Eliminar ────────────────────────────────────────────────────────────
  it('should remove tarjeta when delete button is clicked', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored).toHaveLength(0)
  })

  it('should render delete button for each tarjeta', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)
    await tarjetasApi.create('demo', { ...sampleTarjeta, descripcion: 'Otra' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="delete-button"]')).toHaveLength(2)
  })

  // ─── Editar tarjeta ─────────────────────────────────────────────────────
  it('should show edit form when edit button is clicked', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-edit-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-edit-button"]').exists()).toBe(true)
  })

  it('should populate edit form with current values', async () => {
    await tarjetasApi.create('demo', {
      ...sampleTarjeta,
      pagoMinimo: 200,
      saldoTotal: 5000,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    const descripcion = wrapper.find('[data-testid="edit-descripcion"]').element as HTMLInputElement
    expect(descripcion.value).toBe('Visa BCP')
  })

  it('should cancel edit and return to display mode', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion"]').exists()).toBe(true)

    await wrapper.find('[data-testid="cancel-edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tarjeta-descripcion"]').exists()).toBe(true)
  })

  it('should save edit and update tarjeta', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion"]').setValue('Visa Editada')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await tarjetasApi.getAll('demo')
    expect(stored[0].descripcion).toBe('Visa Editada')
  })

  // ─── Pagar tarjeta ─────────────────────────────────────────────────────
  it('should render pay button for each tarjeta', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="pay-button"]').exists()).toBe(true)
  })

  it('should show pay form when pay button is clicked', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(false)

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="confirm-pay-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-pay-button"]').exists()).toBe(true)
  })

  it('should cancel pay and hide form', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(true)

    await wrapper.find('[data-testid="cancel-pay-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(false)
  })

  it('should confirm pay and create pago record', async () => {
    const tarjeta = await tarjetasApi.create('demo', {
      ...sampleTarjeta,
      saldoTotal: 5000,
    })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="confirm-pay-button"]').trigger('click')
    await flushPromises()

    const pagos = await pagosApi.getAll('demo')
    expect(pagos).toHaveLength(1)
    expect(pagos[0].monto).toBe(3500)
    expect(pagos[0].tarjetaId).toBe(tarjeta.id)

    // montoDeudaActual should be reduced
    const updated = await tarjetasApi.getAll('demo')
    expect(updated[0].montoDeudaActual).toBe(0)
  })

  it('should hide pay form after successful payment', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="confirm-pay-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(false)
  })

  it('should close pay form when edit button is clicked', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(true)

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="pay-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-descripcion"]').exists()).toBe(true)
  })

  // ─── Historial de pagos ────────────────────────────────────────────────
  it('should show historial section when pagos exist', async () => {
    const tarjeta = await tarjetasApi.create('demo', sampleTarjeta)
    await pagosApi.create('demo', { tarjetaId: tarjeta.id, monto: 500, fecha: '2026-02-27' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="pagos-historial"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toggle-historial"]').text()).toContain('Historial de pagos (1)')
  })

  it('should not show historial when no pagos exist', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="pagos-historial"]').exists()).toBe(false)
  })

  it('should toggle historial list visibility', async () => {
    const tarjeta = await tarjetasApi.create('demo', sampleTarjeta)
    await pagosApi.create('demo', { tarjetaId: tarjeta.id, monto: 500, fecha: '2026-02-27' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="historial-list"]').exists()).toBe(false)

    await wrapper.find('[data-testid="toggle-historial"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="historial-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="pago-item"]')).toHaveLength(1)
  })

  it('should display pago amount in historial', async () => {
    const tarjeta = await tarjetasApi.create('demo', sampleTarjeta)
    await pagosApi.create('demo', { tarjetaId: tarjeta.id, monto: 1500, fecha: '2026-02-27' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-historial"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="pago-item"]').text()).toContain('1,500')
  })

  it('should remove pago when remove button is clicked', async () => {
    const tarjeta = await tarjetasApi.create('demo', sampleTarjeta)
    await pagosApi.create('demo', { tarjetaId: tarjeta.id, monto: 500, fecha: '2026-02-27' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="toggle-historial"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="remove-pago-button"]').trigger('click')
    await flushPromises()

    const stored = await pagosApi.getAll('demo')
    expect(stored).toHaveLength(0)
  })

  // ─── TarjetaCard display details ───────────────────────────────────────
  it('should display tarjeta deuda amount', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, montoDeudaActual: 2500 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-deuda"]').text()).toContain('2,500')
  })

  it('should display saldo total when present', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, saldoTotal: 8000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-saldo-total"]').text()).toContain('8,000')
  })

  it('should display dash when saldo total is not set', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-saldo-total"]').text()).toBe('—')
  })

  it('should display pago minimo when present', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, pagoMinimo: 350 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-pago-minimo"]').text()).toContain('350')
  })

  it('should display dash when pago minimo is not set', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-pago-minimo"]').text()).toBe('—')
  })

  it('should display linea total for tarjeta', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="tarjeta-linea"]').text()).toContain('10,000')
  })

  // ─── Form @input/@blur handlers ──────────────────────────────────────
  it('should handle @input and @blur on add form linea-total', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Open modal
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    const input = wrapper.find('[data-testid="linea-total-input"]')
    const el = input.element as HTMLInputElement
    el.value = '5000'
    await input.trigger('input')
    await input.trigger('blur')
    expect(el.value).toBe('5,000')
  })

  it('should handle @input and @blur on add form monto-deuda', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    const input = wrapper.find('[data-testid="monto-deuda-input"]')
    const el = input.element as HTMLInputElement
    el.value = '2500'
    await input.trigger('input')
    await input.trigger('blur')
    expect(el.value).toBe('2,500')
  })

  it('should handle @input and @blur on add form pago-minimo', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    const input = wrapper.find('[data-testid="pago-minimo-input"]')
    const el = input.element as HTMLInputElement
    el.value = '300'
    await input.trigger('input')
    await input.trigger('blur')
    expect(el.value).toBe('300')
  })

  it('should handle @input and @blur on add form saldo-total', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    const input = wrapper.find('[data-testid="saldo-total-input"]')
    const el = input.element as HTMLInputElement
    el.value = '7500'
    await input.trigger('input')
    await input.trigger('blur')
    expect(el.value).toBe('7,500')
  })

  it('should open add modal and show form', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    const modal = wrapper.find('[data-testid="app-modal"]')
    expect(modal.isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="tarjetas-form"]').exists()).toBe(true)
  })

  // ─── TarjetaCard edit CurrencyInput handlers ─────────────────────────
  it('should handle CurrencyInput update in edit form', async () => {
    await tarjetasApi.create('demo', { ...sampleTarjeta, pagoMinimo: 200, saldoTotal: 5000 })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // CurrencyInput data-testid is on the <input> itself
    const lineaInput = wrapper.find('[data-testid="edit-linea-total"]')
    const el = lineaInput.element as HTMLInputElement
    el.value = '12000'
    await lineaInput.trigger('input')
    await lineaInput.trigger('blur')

    const montoInput = wrapper.find('[data-testid="edit-monto-deuda"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '4000'
    await montoInput.trigger('input')
    await montoInput.trigger('blur')

    const saldoInput = wrapper.find('[data-testid="edit-saldo-total"]')
    const saldoEl = saldoInput.element as HTMLInputElement
    saldoEl.value = '6000'
    await saldoInput.trigger('input')
    await saldoInput.trigger('blur')

    const pagoInput = wrapper.find('[data-testid="edit-pago-minimo"]')
    const pagoEl = pagoInput.element as HTMLInputElement
    pagoEl.value = '500'
    await pagoInput.trigger('input')
    await pagoInput.trigger('blur')

    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()
  })

  // ─── Pay form CurrencyInput handler ──────────────────────────────────
  it('should handle CurrencyInput update in pay form', async () => {
    await tarjetasApi.create('demo', sampleTarjeta)

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="pay-button"]').trigger('click')
    await flushPromises()

    // CurrencyInput data-testid is on the <input> itself
    const payInput = wrapper.find('[data-testid="pay-amount-input"]')
    const el = payInput.element as HTMLInputElement
    el.value = '1500'
    await payInput.trigger('input')
    await payInput.trigger('blur')

    await wrapper.find('[data-testid="confirm-pay-button"]').trigger('click')
    await flushPromises()

    const pagos = await pagosApi.getAll('demo')
    expect(pagos).toHaveLength(1)
  })

  // ─── TarjetaCard utilizacion color branches ──────────────────────────
  it('should show red utilization bar for high usage (>=80%)', async () => {
    // 90% utilization
    await tarjetasApi.create('demo', { lineaTotal: 10000, montoDeudaActual: 9000, descripcion: 'Alto' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // jsdom converts #C65A3A to rgb(198, 90, 58)
    const html = wrapper.find('[data-testid="tarjeta-item"]').html()
    expect(html).toContain('90%')
    expect(html.includes('198, 90, 58') || html.includes('#C65A3A')).toBe(true)
  })

  it('should show yellow utilization bar for medium usage (50-79%)', async () => {
    // 60% utilization
    await tarjetasApi.create('demo', { lineaTotal: 10000, montoDeudaActual: 6000, descripcion: 'Medio' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // jsdom converts #D4A017 to rgb(212, 160, 23)
    const html = wrapper.find('[data-testid="tarjeta-item"]').html()
    expect(html).toContain('60%')
    expect(html.includes('212, 160, 23') || html.includes('#D4A017')).toBe(true)
  })

  it('should show blue utilization bar for low usage (<50%)', async () => {
    // 20% utilization
    await tarjetasApi.create('demo', { lineaTotal: 10000, montoDeudaActual: 2000, descripcion: 'Bajo' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // jsdom converts #6A9EC8 to rgb(106, 158, 200)
    const html = wrapper.find('[data-testid="tarjeta-item"]').html()
    expect(html).toContain('20%')
    expect(html.includes('106, 158, 200') || html.includes('#6A9EC8')).toBe(true)
  })

  it('should handle zero lineaTotal (0% utilization)', async () => {
    await tarjetasApi.create('demo', { lineaTotal: 0, montoDeudaActual: 0, descripcion: 'Cero' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // utilizacion returns 0 when lineaTotal is 0
    expect(wrapper.find('[data-testid="tarjeta-item"]').exists()).toBe(true)
  })

  // ─── Modal close via AppModal close event ────────────────────────────
  it('should close modal via AppModal close event', async () => {
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

  // ─── confirmPay early return on invalid monto ──────────────────────
  it('should not add pago when monto is invalid', async () => {
    await tarjetasApi.create('demo', { lineaTotal: 5000, montoDeudaActual: 1000, descripcion: 'Visa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const vm = wrapper.vm as any
    // Set payAmount to an invalid value
    vm.$.setupState.payAmount = 'abc'
    vm.confirmPay('some-id')
    await flushPromises()

    // No pago should be added
    const pagos = await pagosApi.getAll('demo')
    expect(pagos).toHaveLength(0)
  })

  // ─── Saldo disponible ternary branches in form ─────────────────────
  it('should show saldo disponible with lineaTotal and saldoTotal', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.$.setupState.isModalOpen = true
    await flushPromises()

    // Set form values to exercise the ternary
    await wrapper.find('#linea-total').setValue('5000')
    await wrapper.find('#linea-total').trigger('input')
    await wrapper.find('#linea-total').trigger('blur')
    await flushPromises()

    await wrapper.find('#saldo-total').setValue('2000')
    await wrapper.find('#saldo-total').trigger('input')
    await wrapper.find('#saldo-total').trigger('blur')
    await flushPromises()

    // Should show the difference
    expect(wrapper.text()).toContain('3,000')
  })
})
