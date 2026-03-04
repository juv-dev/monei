import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '~/stores/auth'
import { presupuestoApi } from '~/modules/presupuesto/services/api'
import PresupuestoView from '~/modules/presupuesto/views/PresupuestoView.vue'
import AppModal from '~/shared/components/ui/AppModal.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should PresupuestoView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function mountAuthenticated(username = 'jugaz') {
    const { wrapper, pinia } = mountWithPlugins(PresupuestoView)
    const auth = useAuthStore(pinia)
    auth.$patch({ user: { id: username, username, displayName: 'Test', provider: 'demo' }, isAuthenticated: true })
    return { wrapper }
  }

  // ─── Renderizado inicial ─────────────────────────────────────────────────
  it('should render the presupuesto view', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="presupuesto-view"]').exists()).toBe(true)
  })

  it('should render summary card with total gastado', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()
    expect(wrapper.find('[data-testid="summary-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-gastado"]').exists()).toBe(true)
  })

  it('should render the form with categoria input', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="presupuesto-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="categoria-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)
  })

  it('should show empty state when no gastos exist', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gastos-list"]').exists()).toBe(false)
  })

  it('should show S/ 0.00 as initial total gastado', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-gastado"]').text()).toContain('0.00')
  })

  // ─── Datos existentes ────────────────────────────────────────────────────
  it('should display existing gastos from localStorage', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })
    await presupuestoApi.create('jugaz', { monto: 300, descripcion: 'Agua', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Expand the category accordion
    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="gastos-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="gasto-item"]')).toHaveLength(2)
  })

  it('should display correct total when there are gastos', async () => {
    await presupuestoApi.create('jugaz', { monto: 400, descripcion: 'A', categoria: 'General' })
    await presupuestoApi.create('jugaz', { monto: 600, descripcion: 'B', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="total-gastado"]').text()).toContain('1,000')
  })

  it('should display correct description for each gasto', async () => {
    await presupuestoApi.create('jugaz', { monto: 150, descripcion: 'Farmacia', categoria: 'Salud' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Expand the category accordion
    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="gasto-descripcion"]').text()).toBe('Farmacia')
  })

  it('should show categoria-grupo for each category', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Trabajo' })
    await presupuestoApi.create('jugaz', { monto: 50, descripcion: 'Y', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.findAll('[data-testid="categoria-grupo"]')).toHaveLength(2)
  })

  // ─── Validación del formulario ───────────────────────────────────────────
  it('should show error when categoria is empty', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="presupuesto-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('La sección es requerida')
  })

  // ─── Submit exitoso ──────────────────────────────────────────────────────
  it('should create category and clear form on valid submit', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-input"]').setValue('Trabajo')
    await wrapper.find('[data-testid="presupuesto-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
    expect((wrapper.find('[data-testid="categoria-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('should show inline add form after creating a category', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-input"]').setValue('Salud')
    await wrapper.find('[data-testid="presupuesto-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(true)
  })

  // ─── Eliminar gasto ──────────────────────────────────────────────────────
  it('should remove gasto when delete button is clicked', async () => {
    await presupuestoApi.create('jugaz', { monto: 250, descripcion: 'Renta', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Expand the category accordion first
    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
  })

  it('should render delete button for each gasto', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'General' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Y', categoria: 'General' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Expand accordion
    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="delete-button"]')).toHaveLength(2)
  })

  // ─── Toggle categoria ──────────────────────────────────────────────────
  it('should expand and collapse category accordion', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="gastos-list"]').exists()).toBe(false)

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="gastos-list"]').exists()).toBe(true)

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="gastos-list"]').exists()).toBe(false)
  })

  // ─── Categoria subtotal ────────────────────────────────────────────────
  it('should display correct subtotal per category', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Agua', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="categoria-subtotal"]').text()).toContain('300')
  })

  it('should display categoria name', async () => {
    await presupuestoApi.create('jugaz', { monto: 50, descripcion: 'X', categoria: 'Trabajo' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="categoria-nombre"]').text()).toBe('Trabajo')
  })

  // ─── Inline add item ──────────────────────────────────────────────────
  it('should show inline add form when add item button is clicked', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="inline-descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="inline-monto-input"]').exists()).toBe(true)
  })

  it('should cancel inline add form', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(true)

    await wrapper.find('[data-testid="inline-cancel-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(false)
  })

  it('should save inline add item', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="inline-descripcion-input"]').setValue('Agua')
    await wrapper.find('[data-testid="inline-monto-input"]').setValue('150')
    await wrapper.find('[data-testid="inline-save-button"]').trigger('click')
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored).toHaveLength(2)
    expect(stored[1].descripcion).toBe('Agua')
    expect(stored[1].monto).toBe(150)
  })

  it('should show inline error when descripcion is empty', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="inline-monto-input"]').setValue('100')
    await wrapper.find('[data-testid="inline-save-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-error"]').text()).toContain('descripción es requerida')
  })

  it('should show inline error when monto is invalid', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="inline-descripcion-input"]').setValue('Agua')
    await wrapper.find('[data-testid="inline-monto-input"]').setValue('0')
    await wrapper.find('[data-testid="inline-save-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-error"]').text()).toContain('monto debe ser')
  })

  // ─── Inline edit item ──────────────────────────────────────────────────
  it('should show edit form when edit button is clicked', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-monto-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-edit-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-edit-button"]').exists()).toBe(true)
  })

  it('should cancel inline edit', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)

    await wrapper.find('[data-testid="cancel-edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(false)
  })

  it('should save inline edit', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('Luz editada')
    await wrapper.find('[data-testid="edit-monto-input"]').setValue('300')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Luz editada')
    expect(stored[0].monto).toBe(300)
  })

  it('should not save edit when monto is invalid', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-monto-input"]').setValue('0')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].monto).toBe(200)
  })

  it('should not save edit when descripcion is empty', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('')
    await wrapper.find('[data-testid="save-edit-button"]').trigger('click')
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Luz')
  })

  // ─── Category rename ──────────────────────────────────────────────────
  it('should show category edit input when edit button is clicked', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-categoria-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-categoria-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-categoria-button"]').exists()).toBe(true)
  })

  it('should cancel category rename', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="cancel-categoria-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-categoria-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="categoria-nombre"]').text()).toBe('Casa')
  })

  it('should save category rename and update all gastos', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-input"]').setValue('Hogar')
    await wrapper.find('[data-testid="save-categoria-button"]').trigger('click')
    await flushPromises()
    await flushPromises()
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].categoria).toBe('Hogar')
  })

  it('should not rename if new name is same as old', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="save-categoria-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-categoria-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="categoria-nombre"]').text()).toBe('Casa')
  })

  // ─── Delete category ──────────────────────────────────────────────────
  it('should delete category and remove its gasto', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="delete-categoria-button"]').trigger('click')
    await flushPromises()
    await flushPromises()
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored).toHaveLength(0)
  })

  // ─── Drag and drop categories ──────────────────────────────────────────
  it('should have draggable category groups', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const group = wrapper.find('[data-testid="categoria-grupo"]')
    expect(group.attributes('draggable')).toBe('true')
  })

  it('should reorder categories via drag and drop', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Alpha' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Y', categoria: 'Beta' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const groups = wrapper.findAll('[data-testid="categoria-grupo"]')

    await groups[0].trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: () => {} },
    })
    await groups[1].trigger('dragover')
    await groups[1].trigger('drop', {
      dataTransfer: { getData: () => 'Alpha' },
    })
    await flushPromises()

    const orderRaw = localStorage.getItem('finance_jugaz_presupuesto_cat_order')
    expect(orderRaw).toBeTruthy()
    const order = JSON.parse(orderRaw!)
    expect(order[0]).toBe('Beta')
    expect(order[1]).toBe('Alpha')
  })

  it('should persist category order on remount', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Alpha' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Y', categoria: 'Beta' })

    localStorage.setItem('finance_jugaz_presupuesto_cat_order', JSON.stringify(['Beta', 'Alpha']))

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const nombres = wrapper.findAll('[data-testid="categoria-nombre"]')
    expect(nombres[0].text()).toBe('Beta')
    expect(nombres[1].text()).toBe('Alpha')
  })

  // ─── Submit existing categoria (falsy branch of includes check) ──────
  it('should handle submitting existing categoria name without duplicating order', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Submit 'Casa' again via the form — should not add duplicate to order
    const vm = wrapper.vm as any
    vm.$.setupState.isModalOpen = true
    await flushPromises()

    await wrapper.find('[data-testid="categoria-input"]').setValue('Casa')
    await wrapper.find('[data-testid="presupuesto-form"]').trigger('submit')
    await flushPromises()

    // Should not duplicate in order
    const orderRaw = localStorage.getItem(`presupuesto_order_jugaz_cats`)
    if (orderRaw) {
      const order = JSON.parse(orderRaw)
      const count = order.filter((c: string) => c === 'Casa').length
      expect(count).toBe(1)
    }
  })

  // ─── Empty category state ─────────────────────────────────────────────
  it('should show empty state inside expanded empty category', async () => {
    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-input"]').setValue('NuevaCat')
    await wrapper.find('[data-testid="presupuesto-form"]').trigger('submit')
    await flushPromises()

    // Cancel the inline form that auto-opens
    await wrapper.find('[data-testid="inline-cancel-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="categoria-empty-state"]').exists()).toBe(true)
  })

  // ─── Summary details ──────────────────────────────────────────────────
  it('should display mayor seccion in summary', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })
    await presupuestoApi.create('jugaz', { monto: 500, descripcion: 'Y', categoria: 'Trabajo' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="summary-card"]').text()).toContain('500')
  })

  it('should display secciones count in summary', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Y', categoria: 'Trabajo' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="summary-card"]').text()).toContain('2')
  })

  it('should display gasto monto', async () => {
    await presupuestoApi.create('jugaz', { monto: 750, descripcion: 'Renta', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="gasto-monto"]').text()).toContain('750')
  })

  it('should display items count in categoria header', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'A', categoria: 'Casa' })
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'B', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    expect(wrapper.find('[data-testid="categoria-header"]').text()).toContain('2 ítems')
  })

  // ─── @input/@blur handlers ─────────────────────────────────────────────
  it('should handle inline add monto input and blur events', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    // Trigger @input and @blur on inline-monto
    const montoInput = wrapper.find('[data-testid="inline-monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '200'
    await montoInput.trigger('input')
    await montoInput.trigger('blur')
    await flushPromises()

    expect(montoEl.value).toBeDefined()
  })

  it('should handle inline add keydown.enter on descripcion', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="inline-descripcion-input"]').setValue('Agua')
    await wrapper.find('[data-testid="inline-monto-input"]').setValue('150')
    await wrapper.find('[data-testid="inline-descripcion-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored).toHaveLength(2)
  })

  it('should handle inline add keydown.esc on descripcion', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(true)

    await wrapper.find('[data-testid="inline-descripcion-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(false)
  })

  it('should handle edit form input/blur and keydown events', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // Trigger @input and @blur on edit monto
    const montoInput = wrapper.find('[data-testid="edit-monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '300'
    await montoInput.trigger('input')
    await montoInput.trigger('blur')

    // keydown.enter on edit-descripcion-input saves
    await wrapper.find('[data-testid="edit-descripcion-input"]').setValue('Luz editada')
    await wrapper.find('[data-testid="edit-descripcion-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].descripcion).toBe('Luz editada')
  })

  it('should handle edit form keydown.esc to cancel', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)

    await wrapper.find('[data-testid="edit-descripcion-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(false)
  })

  it('should handle categoria edit keydown events', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    // Trigger enter on categoria edit input
    await wrapper.find('[data-testid="edit-categoria-input"]').setValue('Hogar')
    await wrapper.find('[data-testid="edit-categoria-input"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].categoria).toBe('Hogar')
  })

  it('should handle categoria edit escape keydown', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-categoria-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="categoria-nombre"]').text()).toBe('Casa')
  })

  // ─── Item edit form categoria keydown handlers ──────────────────────
  it('should handle keydown.enter on edit-categoria-input inside item edit', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    // Modify the categoria in the item edit form and press enter
    const catInput = wrapper.find('[data-testid="edit-categoria-input"]')
    await catInput.setValue('Hogar')
    await catInput.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].categoria).toBe('Hogar')
  })

  it('should handle keydown.esc on edit-categoria-input inside item edit', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(true)

    // Press escape on the edit-categoria-input field — should cancel edit
    const catInput = wrapper.find('[data-testid="edit-categoria-input"]')
    await catInput.trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-descripcion-input"]').exists()).toBe(false)
  })

  it('should handle inline monto keydown.enter to submit', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="inline-descripcion-input"]').setValue('Agua')
    const montoInput = wrapper.find('[data-testid="inline-monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '150'
    await montoInput.trigger('input')
    await montoInput.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored).toHaveLength(2)
  })

  it('should handle inline monto keydown.esc to cancel', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="add-item-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(true)

    await wrapper.find('[data-testid="inline-monto-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="inline-add-form"]').exists()).toBe(false)
  })

  it('should handle keydown.enter on edit-monto-input to save', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()

    const montoInput = wrapper.find('[data-testid="edit-monto-input"]')
    const montoEl = montoInput.element as HTMLInputElement
    montoEl.value = '350'
    await montoInput.trigger('input')
    await montoInput.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].monto).toBe(350)
  })

  it('should handle keydown.esc on edit-monto-input to cancel', async () => {
    await presupuestoApi.create('jugaz', { monto: 200, descripcion: 'Luz', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-monto-input"]').exists()).toBe(true)

    await wrapper.find('[data-testid="edit-monto-input"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-monto-input"]').exists()).toBe(false)
  })

  // ─── Drag end handler ──────────────────────────────────────────────────
  it('should reset drag state on dragend', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'X', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const group = wrapper.find('[data-testid="categoria-grupo"]')
    await group.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: () => {} },
    })
    await group.trigger('dragend')
    await flushPromises()

    expect(group.classes()).not.toContain('opacity-40')
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

  // ─── Rename edge case: categoria not found ──────────────────────────
  it('should handle rename when original categoria no longer exists', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    const vm = wrapper.vm as any
    // Simulate state where editingCategoria points to a non-existent name
    vm.$.setupState.editingCategoria = 'NonExistent'
    vm.$.setupState.editCategoriaNombre = 'NewName'
    await flushPromises()

    // Call saveCategoria directly
    vm.saveEditCategoria('NonExistent')
    await flushPromises()

    // Should have reset editingCategoria to null
    expect(vm.editingCategoria).toBeNull()
  })

  // ─── Rename expanded categoria ─────────────────────────────────────
  it('should rename expanded categoria and keep it expanded', async () => {
    await presupuestoApi.create('jugaz', { monto: 100, descripcion: 'Gas', categoria: 'Casa' })

    const { wrapper } = mountAuthenticated()
    await flushPromises()

    // Expand the categoria first
    await wrapper.find('[data-testid="categoria-header"]').trigger('click')
    await flushPromises()

    // Now rename it
    await wrapper.find('[data-testid="edit-categoria-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="edit-categoria-input"]').setValue('Hogar')
    await wrapper.find('[data-testid="save-categoria-button"]').trigger('click')
    await flushPromises()
    await flushPromises()

    // The renamed categoria should still be expanded (items visible)
    const stored = await presupuestoApi.getAll('jugaz')
    expect(stored[0].categoria).toBe('Hogar')
  })
})
