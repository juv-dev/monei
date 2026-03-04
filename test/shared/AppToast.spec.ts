import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToast from '~/shared/components/ui/AppToast.vue'

describe('should AppToast', () => {
  it('should render success toast', () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [{ id: 1, message: 'Operación exitosa', type: 'success' }],
      },
    })

    expect(wrapper.find('[data-testid="toast-notification"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Operación exitosa')
  })

  it('should render error toast', () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [{ id: 1, message: 'Algo falló', type: 'error' }],
      },
    })

    expect(wrapper.find('[data-testid="toast-notification"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Algo falló')
  })

  it('should render multiple toasts', () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [
          { id: 1, message: 'Primero', type: 'success' },
          { id: 2, message: 'Segundo', type: 'error' },
        ],
      },
    })

    expect(wrapper.findAll('[data-testid="toast-notification"]')).toHaveLength(2)
  })

  it('should render nothing when toasts array is empty', () => {
    const wrapper = mount(AppToast, {
      props: { toasts: [] },
    })

    expect(wrapper.find('[data-testid="toast-notification"]').exists()).toBe(false)
  })

  it('should emit dismiss when close button is clicked', async () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [{ id: 42, message: 'Dismiss me', type: 'success' }],
      },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('dismiss')).toBeTruthy()
    expect(wrapper.emitted('dismiss')![0]).toEqual([42])
  })

  it('should apply success border color', () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [{ id: 1, message: 'OK', type: 'success' }],
      },
    })

    const toast = wrapper.find('[data-testid="toast-notification"]')
    expect(toast.attributes('style')).toContain('border-color')
    expect(toast.attributes('style')).toContain('62')
  })

  it('should apply error border color', () => {
    const wrapper = mount(AppToast, {
      props: {
        toasts: [{ id: 1, message: 'Error', type: 'error' }],
      },
    })

    const toast = wrapper.find('[data-testid="toast-notification"]')
    expect(toast.attributes('style')).toContain('border-color')
    expect(toast.attributes('style')).toContain('198')
  })
})
