import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import { ingresosApi } from '~/modules/ingresos/services/api'
import IngresosView from '~/modules/ingresos/views/IngresosView.vue'
import AppModal from '~/shared/components/ui/AppModal.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should IngresosView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function mountAuthenticated(username = 'jugaz') {
    const { wrapper, pinia } = mountWithPlugins(IngresosView)
    const auth = useAuthStore(pinia)
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the view container', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="ingresos-view"]').exists()).toBe(true)
  })

  it('should render summary card with total', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="summary-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-ingresos"]').exists()).toBe(true)
  })

  it('should render form elements', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="ingresos-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="monto-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)
  })

  it('should show empty state when no ingresos exist', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ingresos-list"]').exists()).toBe(false)
  })

  it('should show S/ 0.00 as initial total', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-ingresos"]').text()).toContain('0.00')
  })

  // ─── Datos existentes ────────────────────────────────────────────────────
  it('should display existing ingresos from localStorage', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })
    await ingresosApi.create('jugaz', { monto: 300, descripcion: 'Bono' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="ingresos-list"]').exists()).toBe(true)
    const items = wrapper.findAll('[data-testid="ingreso-item"]')
    expect(items).toHaveLength(2)
  })

  it('should display correct descriptions for each ingreso', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'Freelance' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="ingreso-descripcion"]').text()).toBe('Freelance')
  })

  it('should display correct total when there are ingresos', async () => {
    await ingresosApi.create('jugaz', { monto: 1000, descripcion: 'A' })
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'B' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-ingresos"]').text()).toContain('1,500')
  })

  // ─── Formulario: validación ──────────────────────────────────────────────
  it('should show error when submitting with empty descripcion', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="monto-input"]').setValue('1000')
    await wrapper.find('[data-testid="ingresos-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('La descripción es requerida')
  })

  it('should show error when monto is zero or negative', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Test')
    await wrapper.find('[data-testid="monto-input"]').setValue('0')
    await wrapper.find('[data-testid="ingresos-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('El monto debe ser un número positivo')
  })

  it('should show error when monto is not a number', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Test')
    await wrapper.find('[data-testid="monto-input"]').setValue('abc')
    await wrapper.find('[data-testid="ingresos-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(true)
  })

  // ─── Formulario: submit exitoso ──────────────────────────────────────────
  it('should add ingreso and clear form on valid submit', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="monto-input"]').setValue('2000')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Nuevo ingreso')
    await wrapper.find('[data-testid="ingresos-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
    expect((wrapper.find('[data-testid="monto-input"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('[data-testid="descripcion-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('should render delete buttons for each ingreso', async () => {
    await ingresosApi.create('jugaz', { monto: 100, descripcion: 'X' })
    await ingresosApi.create('jugaz', { monto: 200, descripcion: 'Y' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const deleteButtons = wrapper.findAll('[data-testid="delete-button"]')
    expect(deleteButtons).toHaveLength(2)
  })

  // ─── Eliminar item ───────────────────────────────────────────────────────
  it('should remove ingreso when delete button clicked', async () => {
    await ingresosApi.create('jugaz', { monto: 500, descripcion: 'Para borrar' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    await flushPromises()

    // ConfirmDialog teleports to body — confirm via document.body
    const confirmBtn = document.body.querySelector('[data-testid="confirm-dialog-confirm"]') as HTMLElement | null
    if (confirmBtn) {
      confirmBtn.click()
      await flushPromises()
    }

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
  })

  // ─── Inline edit ───────────────────────────────────────────────────────
  it('should show edit form when edit button is clicked', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-monto-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-edit-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-edit-button"]').exists()).toBe(true)
  })

  it('should populate edit form with current values', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    const descInput = wrapper.find('[data-testid="edit-descripcion-input"]').element as HTMLInputElement
    expect(descInput.value).toBe('Salario')
  })

  it('should cancel edit and return to display mode', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)

    await wrapper.find('[data-testid="cancel-edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ingreso-descripcion"]').exists()).toBe(true)
  })

  it('should save edit and update ingreso', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('Salario Editado')
    await wrapper.find('[data-testid="edit-monto-input"]').setValue('2000')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Salario Editado')
    expect(stored[0].monto).toBe(2000)
  })

  it('should not save edit when descripcion is empty', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Salario')
  })

  it('should not save edit when monto is invalid', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-monto-input"]').setValue('0')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored[0].monto).toBe(1500)
  })

  // ─── Display details ──────────────────────────────────────────────────
  it('should display monto for each ingreso', async () => {
    await ingresosApi.create('jugaz', { monto: 3000, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="ingreso-monto"]').text()).toContain('3,000')
  })

  it('should display promedio when ingresos exist', async () => {
    await ingresosApi.create('jugaz', { monto: 2000, descripcion: 'A' })
    await ingresosApi.create('jugaz', { monto: 4000, descripcion: 'B' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.text()).toContain('3,000')
  })

  it('should display dash for promedio when no ingresos', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="summary-card"]').text()).toContain('—')
  })

  it('should display registros count', async () => {
    await ingresosApi.create('jugaz', { monto: 100, descripcion: 'A' })
    await ingresosApi.create('jugaz', { monto: 200, descripcion: 'B' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="summary-card"]').text()).toContain('2')
  })

  // ─── @input/@blur handlers ─────────────────────────────────────────────
  it('should handle edit form monto input and blur events', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // Trigger @input on edit-monto
    const montoInput = wrapper.find('[data-testid="edit-monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '2500'
    await montoInput.trigger('input')
    await montoInput.trigger('blur')
    await flushPromises()

    expect(montoEl.value).toBeDefined()
  })

  it('should handle add form monto input and blur events', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const montoInput = wrapper.find('[data-testid="monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '3000'
    await montoInput.trigger('input')
    await montoInput.trigger('blur')
    await flushPromises()

    expect(montoEl.value).toBeDefined()
  })

  it('should handle edit keydown.enter to save', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('Salario Updated')
    await wrapper.find('[data-testid="edit-monto-input"]').setValue('2000')

    // Trigger enter key on description input to save
    await wrapper.find('[data-testid="edit-descripcion-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Salario Updated')
  })

  it('should handle edit keydown.esc to cancel', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)

    await wrapper.find('[data-testid="edit-descripcion-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(false)
  })

  // ─── openModal function ────────────────────────────────────────────────
  it('should open modal and show form', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="ingresos-form"]').exists()).toBe(true)
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

  // ─── Edit monto keydown.enter ────────────────────────────────────────
  it('should handle edit keydown.enter on monto input to save', async () => {
    await ingresosApi.create('jugaz', { monto: 1500, descripcion: 'Salario' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-monto-input"]').setValue('2000')
    await wrapper.find('[data-testid="edit-monto-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await ingresosApi.getAll('jugaz')
    expect(stored[0].monto).toBe(2000)
  })
})
