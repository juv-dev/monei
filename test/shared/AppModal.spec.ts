import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppModal from '~/shared/components/ui/AppModal.vue'

describe('should AppModal', () => {
  it('should render title', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Test Modal' },
    })

    expect(wrapper.text()).toContain('Test Modal')
  })

  it('should show when open is true', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Visible' },
    })

    const modal = wrapper.find('[data-testid="app-modal"]')
    // v-show removes display: none when true
    const style = modal.attributes('style') ?? ''
    expect(style).not.toContain('display: none')
  })

  it('should hide when open is false', () => {
    const wrapper = mount(AppModal, {
      props: { open: false, title: 'Hidden' },
    })

    const modal = wrapper.find('[data-testid="app-modal"]')
    expect(modal.attributes('style')).toContain('display: none')
  })

  it('should emit close when backdrop is clicked', async () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Backdrop' },
    })

    // Backdrop is the first div inside modal
    const backdrop = wrapper.find('[data-testid="app-modal"] > div:first-child')
    await backdrop.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should emit close when close button is clicked', async () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Close Button' },
    })

    const closeBtn = wrapper.find('button[aria-label="Cerrar modal"]')
    await closeBtn.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should render slot content', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Slot' },
      slots: { default: '<p data-testid="slot-content">Hello</p>' },
    })

    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  it('should apply accent color to header border', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'Accent', accentColor: '#6A1E2D' },
    })

    const header = wrapper.find('div.flex.items-center.justify-between')
    // jsdom converts hex to rgb
    expect(header.attributes('style')).toContain('border-bottom-color')
  })

  it('should not apply accent border when no accentColor', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'No Accent' },
    })

    const header = wrapper.find('div.flex.items-center.justify-between')
    const style = header.attributes('style') ?? ''
    expect(style).not.toContain('border-bottom-color')
  })
})
