import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, type Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Deuda } from '~/shared/types'

vi.mock('~/modules/deudas/composables/useDeudas', () => ({
  useDeudas: vi.fn(),
}))

vi.mock('~/shared/composables/useAppFeedback', () => ({
  useAppFeedback: vi.fn(),
}))

import CreditosView from '~/modules/creditos/views/CreditosView.vue'
import AppModal from '~/shared/components/ui/AppModal.vue'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'
import { createGlobalMountOptions } from '../../helpers/setup'
import { useDeudas } from '~/modules/deudas/composables/useDeudas'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'

let deudas: Ref<Deuda[]>
let isLoading: Ref<boolean>
let isError: Ref<boolean>
let isAdding: Ref<boolean>
let isUpdating: Ref<boolean>
let totalPendiente: Ref<number>
let addDeuda: ReturnType<typeof vi.fn>
let removeDeuda: ReturnType<typeof vi.fn>
let updateDeuda: ReturnType<typeof vi.fn>
let showToast: ReturnType<typeof vi.fn>
let startLoading: ReturnType<typeof vi.fn>
let finishLoading: ReturnType<typeof vi.fn>

function mountCreditos() {
  const { global } = createGlobalMountOptions()
  const wrapper = mount(CreditosView, {
    global: {
      ...global,
      components: { AppModal, ConfirmDialog },
    },
  })
  return { wrapper }
}

const sampleDeuda: Deuda = {
  id: 'deuda-1',
  userId: 'test-user',
  createdAt: '2024-01-01T00:00:00.000Z',
  nombrePersona: 'BCP',
  totalDeuda: 6000,
  tasaInteres: 5,
  cuotasPagadas: 2,
  totalCuotas: 12,
  cuotaMensual: 500,
  montoActualPendiente: 5000,
  descripcion: 'Préstamo personal',
}

describe('should CreditosView', () => {
  beforeEach(() => {
    deudas = ref([])
    isLoading = ref(false)
    isError = ref(false)
    isAdding = ref(false)
    isUpdating = ref(false)
    totalPendiente = ref(0)
    addDeuda = vi.fn()
    removeDeuda = vi.fn()
    updateDeuda = vi.fn()
    showToast = vi.fn()
    startLoading = vi.fn()
    finishLoading = vi.fn()

    vi.mocked(useDeudas).mockReturnValue({
      deudas,
      isLoading,
      isError,
      isAdding,
      isUpdating,
      totalPendiente,
      addDeuda,
      removeDeuda,
      updateDeuda,
    } as any)

    vi.mocked(useAppFeedback).mockReturnValue({
      showToast,
      startLoading,
      finishLoading,
      isLoading: ref(false),
      loadingColor: ref('#3E6F73'),
      toasts: ref([]),
      dismissToast: vi.fn(),
    } as any)
  })

  it('should render the creditos-view wrapper', () => {
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="creditos-view"]').exists()).toBe(true)
  })

  it('should show loading-state when isLoading is true', () => {
    isLoading.value = true
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(false)
  })

  it('should show error-state when isError is true', () => {
    isError.value = true
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(false)
  })

  it('should show empty-state when deudas is empty', () => {
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deuda-item"]').exists()).toBe(false)
  })

  it('should render creditos-summary section when not loading and not in error', () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="creditos-summary"]').exists()).toBe(true)
  })

  it('should render one deuda-item per entry in deudas', () => {
    deudas.value = [
      sampleDeuda,
      { ...sampleDeuda, id: 'deuda-2', nombrePersona: 'Scotiabank' },
    ]
    const { wrapper } = mountCreditos()
    expect(wrapper.findAll('[data-testid="deuda-item"]')).toHaveLength(2)
  })

  it('should display totalPendiente in total-credito', () => {
    totalPendiente.value = 5000
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="total-credito"]').text()).toContain('5')
  })

  it('should open modal when open-modal-button is clicked', async () => {
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(false)
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)
  })

  it('should show "Agregar préstamo" as submit button label in add mode', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="submit-button"]').text()).toBe('Agregar préstamo')
  })

  it('should show form-error when nombrePersona is empty on submit', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda test')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('1000')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('El nombre de la persona es requerido')
  })

  it('should show form-error when descripcion is empty on submit', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('1000')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="form-error"]').text()).toBe('La descripción es requerida')
  })

  it('should show form-error when totalDeuda is zero on submit', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('1000')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('total de la deuda')
  })

  it('should show form-error when tasaInteres is empty on submit', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('1000')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('tasa de interés')
  })

  it('should show form-error when monto pendiente is empty on submit', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Deuda')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('1000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('monto pendiente')
  })

  it('should call addDeuda and startLoading on valid submit in add mode', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Préstamo personal')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('5000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('5000')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(addDeuda).toHaveBeenCalledOnce()
    expect(startLoading).toHaveBeenCalledWith('#D4A017')
    expect(updateDeuda).not.toHaveBeenCalled()
  })

  it('should call addDeuda with optional cuotaMensual and totalCuotas when provided', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="nombre-persona-input"]').setValue('BCP')
    await wrapper.find('[data-testid="descripcion-input"]').setValue('Préstamo')
    await wrapper.find('[data-testid="total-deuda-input"]').setValue('10000')
    await wrapper.find('[data-testid="tasa-interes-input"]').setValue('5')
    await wrapper.find('[data-testid="monto-pendiente-input"]').setValue('8000')
    await wrapper.find('[data-testid="cuota-mensual-input"]').setValue('500')
    await wrapper.find('[data-testid="cuotas-pagadas-input"]').setValue('4')
    await wrapper.find('[data-testid="total-cuotas-input"]').setValue('20')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(addDeuda).toHaveBeenCalledWith(
      expect.objectContaining({
        cuotasPagadas: 4,
        totalCuotas: 20,
      }),
    )
  })

  it('should call finishLoading, showToast and close modal when isAdding transitions from true to false', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)

    isAdding.value = true
    await nextTick()
    isAdding.value = false
    await flushPromises()

    expect(finishLoading).toHaveBeenCalledOnce()
    expect(showToast).toHaveBeenCalledWith('Préstamo agregado correctamente')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(false)
  })

  it('should open ConfirmDialog when trash button is clicked', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[aria-label="Eliminar préstamo de BCP"]').trigger('click')

    expect(document.body.querySelector('[data-testid="confirm-dialog-confirm"]')).not.toBeNull()
  })

  it('should call removeDeuda with the deuda id when delete is confirmed', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[aria-label="Eliminar préstamo de BCP"]').trigger('click')
    await wrapper.findComponent(ConfirmDialog).vm.$emit('confirm')
    await nextTick()

    expect(removeDeuda).toHaveBeenCalledWith('deuda-1')
  })

  it('should open modal in edit mode when edit-button is clicked', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)
  })

  it('should show "Editar préstamo" title in edit mode', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="app-modal"]').text()).toContain('Editar préstamo')
  })

  it('should show "Guardar cambios" as submit button label in edit mode', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.find('[data-testid="submit-button"]').text()).toBe('Guardar cambios')
  })

  it('should pre-populate nombrePersona with deuda data when edit modal opens', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    const input = wrapper.find('[data-testid="nombre-persona-input"]').element as HTMLInputElement
    expect(input.value).toBe('BCP')
  })

  it('should pre-populate descripcion with deuda data when edit modal opens', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    const input = wrapper.find('[data-testid="descripcion-input"]').element as HTMLInputElement
    expect(input.value).toBe('Préstamo personal')
  })

  it('should call updateDeuda with the deuda id and form fields on submit in edit mode', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(updateDeuda).toHaveBeenCalledWith(
      'deuda-1',
      expect.objectContaining({
        nombrePersona: 'BCP',
        descripcion: 'Préstamo personal',
      }),
    )
  })

  it('should NOT call addDeuda on submit in edit mode', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await wrapper.find('[data-testid="submit-button"]').trigger('click')

    expect(addDeuda).not.toHaveBeenCalled()
  })

  it('should call showToast and close modal when isUpdating transitions from true to false', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)

    isUpdating.value = true
    await nextTick()
    isUpdating.value = false
    await flushPromises()

    expect(showToast).toHaveBeenCalledWith('Préstamo actualizado')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(false)
  })

  it('should reset to add mode after closing edit modal and reopening with open-modal-button', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    expect(wrapper.find('[data-testid="submit-button"]').text()).toBe('Guardar cambios')

    await wrapper.findComponent(AppModal).vm.$emit('close')
    await nextTick()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="submit-button"]').text()).toBe('Agregar préstamo')
  })

  it('should clear form-error when modal is closed and reopened', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')

    await wrapper.find('[data-testid="submit-button"]').trigger('click')
    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(true)

    await wrapper.findComponent(AppModal).vm.$emit('close')
    await nextTick()

    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
  })

  it('should show toggle-amortizacion-button when totalCuotas is set and positive', () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(true)
  })

  it('should not show toggle-amortizacion-button when totalCuotas is undefined', () => {
    deudas.value = [{ ...sampleDeuda, totalCuotas: undefined }]
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(false)
  })

  it('should not show toggle-amortizacion-button when totalCuotas is 0', () => {
    deudas.value = [{ ...sampleDeuda, totalCuotas: 0 }]
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(false)
  })

  it('should show amortizacion table when toggle-amortizacion-button is clicked', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()
    const table = wrapper.find('[data-testid="amortizacion-table"]').element as HTMLElement

    expect(table.style.display).toBe('none')
    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    expect(table.style.display).not.toBe('none')
  })

  it('should hide amortizacion table on second toggle-amortizacion-button click', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()
    const table = wrapper.find('[data-testid="amortizacion-table"]').element as HTMLElement

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    expect(table.style.display).not.toBe('none')

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')
    expect(table.style.display).toBe('none')
  })

  it('should render the correct number of amortizacion rows matching totalCuotas', async () => {
    deudas.value = [{ ...sampleDeuda, totalCuotas: 6 }]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    expect(wrapper.findAll('[data-testid="amortizacion-row"]')).toHaveLength(6)
  })

  it('should render no amortizacion rows when cuotaMensual and montoActualPendiente are 0', async () => {
    deudas.value = [{ ...sampleDeuda, cuotaMensual: 0, montoActualPendiente: 0 }]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    expect(wrapper.findAll('[data-testid="amortizacion-row"]')).toHaveLength(0)
  })

  it('should mark rows with numero <= cuotasPagadas as paid via aria-label', async () => {
    deudas.value = [{ ...sampleDeuda, cuotasPagadas: 2, totalCuotas: 5 }]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    expect(rows[0].attributes('aria-label')).toContain('pagada')
    expect(rows[1].attributes('aria-label')).toContain('pagada')
    expect(rows[2].attributes('aria-label')).toContain('pendiente')
    expect(rows[3].attributes('aria-label')).toContain('pendiente')
    expect(rows[4].attributes('aria-label')).toContain('pendiente')
  })

  it('should apply inset box-shadow to the current cuota row (cuotasPagadas + 1)', async () => {
    deudas.value = [{ ...sampleDeuda, cuotasPagadas: 2, totalCuotas: 5 }]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    expect((rows[2].element as HTMLElement).style.boxShadow).toBe('inset 3px 0 0 #D4A017')
    expect((rows[0].element as HTMLElement).style.boxShadow).toBe('none')
    expect((rows[3].element as HTMLElement).style.boxShadow).toBe('none')
  })

  it('should call updateDeuda with N cuotasPagadas when clicking an unpaid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[2].trigger('click')

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 3,
      montoActualPendiente: Math.max(0, 6000 - 3 * 500),
    })
  })

  it('should call updateDeuda with N-1 cuotasPagadas when clicking a paid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[1].trigger('click')

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 1,
      montoActualPendiente: Math.max(0, 6000 - 1 * 500),
    })
  })

  it('should trigger pagarCuota on Enter keydown on an unpaid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[2].trigger('keydown', { key: 'Enter' })

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 3,
      montoActualPendiente: Math.max(0, 6000 - 3 * 500),
    })
  })

  it('should trigger pagarCuota on Space keydown on an unpaid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[2].trigger('keydown', { key: ' ' })

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 3,
      montoActualPendiente: Math.max(0, 6000 - 3 * 500),
    })
  })

  it('should trigger despagarCuota on Enter keydown on a paid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[1].trigger('keydown', { key: 'Enter' })

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 1,
      montoActualPendiente: Math.max(0, 6000 - 1 * 500),
    })
  })

  it('should trigger despagarCuota on Space keydown on a paid cuota row', async () => {
    deudas.value = [sampleDeuda]
    const { wrapper } = mountCreditos()

    await wrapper.find('[data-testid="toggle-amortizacion-button"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="amortizacion-row"]')
    await rows[0].trigger('keydown', { key: ' ' })

    expect(updateDeuda).toHaveBeenCalledWith('deuda-1', {
      cuotasPagadas: 0,
      montoActualPendiente: Math.max(0, 6000 - 0 * 500),
    })
  })

  it('should show an edit-button for each rendered deuda item', () => {
    deudas.value = [
      sampleDeuda,
      { ...sampleDeuda, id: 'deuda-2', nombrePersona: 'Scotiabank' },
    ]
    const { wrapper } = mountCreditos()
    expect(wrapper.findAll('[data-testid="edit-button"]')).toHaveLength(2)
  })

  it('should close modal via AppModal close event', async () => {
    const { wrapper } = mountCreditos()
    await wrapper.find('[data-testid="open-modal-button"]').trigger('click')
    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(true)

    await wrapper.findComponent(AppModal).vm.$emit('close')
    await nextTick()

    expect(wrapper.find('[data-testid="app-modal"]').isVisible()).toBe(false)
  })

  it('should not show amortizacion toggle button when loading', () => {
    isLoading.value = true
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(false)
  })

  it('should not show amortizacion toggle button when in error state', () => {
    isError.value = true
    const { wrapper } = mountCreditos()
    expect(wrapper.find('[data-testid="toggle-amortizacion-button"]').exists()).toBe(false)
  })
})
