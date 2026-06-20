import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import ConfirmDialog from '~/shared/components/ui/ConfirmDialog.vue'

describe('should ConfirmDialog', () => {
  let wrapper: VueWrapper

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('should not render dialog when open is false', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: false },
      attachTo: document.body,
    })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('should render dialog with role dialog when open is true', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('should show title text', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('¿Eliminar este registro?')
  })

  it('should show default message when message prop is not provided', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('Esta acción no se puede deshacer.')
  })

  it('should show custom message when message prop is provided', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true, message: 'This cannot be reversed.' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('This cannot be reversed.')
  })

  it('should emit confirm when confirm button is clicked', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    ;(document.body.querySelector('[data-testid="confirm-dialog-confirm"]') as HTMLElement).click()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('should emit cancel when cancel button is clicked', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    )!
    cancelBtn.click()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('should emit cancel when backdrop overlay is clicked', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    ;(document.body.querySelector('.absolute.inset-0') as HTMLElement).click()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('should have aria-modal attribute set to true', () => {
    wrapper = mount(ConfirmDialog, {
      props: { open: true },
      attachTo: document.body,
    })
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
  })
})
