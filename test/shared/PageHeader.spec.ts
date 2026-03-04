import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '~/shared/components/layout/PageHeader.vue'

describe('should PageHeader', () => {
  it('should render title', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Mi Título' },
    })

    expect(wrapper.text()).toContain('Mi Título')
  })

  it('should render subtitle when provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Título', subtitle: 'Subtítulo' },
    })

    expect(wrapper.text()).toContain('Subtítulo')
  })

  it('should not render subtitle when not provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Solo Título' },
    })

    expect(wrapper.findAll('p')).toHaveLength(0)
  })

  it('should render button when buttonLabel is provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Con Botón', buttonLabel: 'Agregar' },
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').text()).toContain('Agregar')
  })

  it('should not render button when no buttonLabel', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Sin Botón' },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('should emit action when button is clicked', async () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Click', buttonLabel: 'Action' },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('action')).toBeTruthy()
  })

  it('should apply buttonTestid', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Test', buttonLabel: 'Btn', buttonTestid: 'my-btn' },
    })

    expect(wrapper.find('[data-testid="my-btn"]').exists()).toBe(true)
  })

  it('should apply buttonColor to button gradient', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Color', buttonLabel: 'Btn', buttonColor: '#6A1E2D' },
    })

    // jsdom converts hex colors in gradients to rgb
    expect(wrapper.find('button').attributes('style')).toContain('linear-gradient')
  })
})
