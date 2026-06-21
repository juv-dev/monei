import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import EmptyState from '~/shared/components/ui/EmptyState.vue'

const MockIcon = defineComponent({
  name: 'MockIcon',
  render() {
    return h('svg')
  },
})

describe('should EmptyState', () => {
  const baseProps = {
    icon: MockIcon,
    color: '#FF5733',
    title: 'Nothing here',
    subtitle: 'Try adding something',
  }

  it('should render title and subtitle', () => {
    const wrapper = mount(EmptyState, { props: baseProps })
    expect(wrapper.text()).toContain('Nothing here')
    expect(wrapper.text()).toContain('Try adding something')
  })

  it('should render icon via dynamic component', () => {
    const wrapper = mount(EmptyState, { props: baseProps })
    expect(wrapper.findComponent(MockIcon).exists()).toBe(true)
  })

  it('should apply testid as data-testid when provided', () => {
    const wrapper = mount(EmptyState, {
      props: { ...baseProps, testid: 'empty-state-widget' },
    })
    expect(wrapper.attributes('data-testid')).toBe('empty-state-widget')
  })

  it('should not set data-testid when testid is not provided', () => {
    const wrapper = mount(EmptyState, { props: baseProps })
    expect(wrapper.attributes('data-testid')).toBeUndefined()
  })

  it('should have bg-white class when inline prop is not set', () => {
    const wrapper = mount(EmptyState, { props: baseProps })
    expect(wrapper.classes()).toContain('bg-white')
  })

  it('should not have bg-white class when inline is true', () => {
    const wrapper = mount(EmptyState, {
      props: { ...baseProps, inline: true },
    })
    expect(wrapper.classes()).not.toContain('bg-white')
  })

  it('should not render action button when actionLabel is not provided', () => {
    const wrapper = mount(EmptyState, { props: baseProps })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('should render action button with label text when actionLabel is provided', () => {
    const wrapper = mount(EmptyState, {
      props: { ...baseProps, actionLabel: 'Add entry' },
    })
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Add entry')
  })

  it('should emit action event when action button is clicked', async () => {
    const wrapper = mount(EmptyState, {
      props: { ...baseProps, actionLabel: 'Add entry' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })
})
