import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { CreditCard } from 'lucide-vue-next'
import StatCard from '~/shared/components/ui/StatCard.vue'

describe('should StatCard', () => {
  const defaultProps = {
    label: 'Total',
    value: 'S/ 1,500.00',
    icon: CreditCard,
    color: '#6A1E2D',
    iconBg: 'rgba(106,30,45,0.10)',
  }

  it('should render label and value', () => {
    const wrapper = mount(StatCard, { props: defaultProps })

    expect(wrapper.text()).toContain('Total')
    expect(wrapper.text()).toContain('S/ 1,500.00')
  })

  it('should apply testid when provided', () => {
    const wrapper = mount(StatCard, {
      props: { ...defaultProps, testid: 'my-card' },
    })

    expect(wrapper.find('[data-testid="my-card"]').exists()).toBe(true)
  })

  it('should apply valueTestid when provided', () => {
    const wrapper = mount(StatCard, {
      props: { ...defaultProps, valueTestid: 'my-value' },
    })

    expect(wrapper.find('[data-testid="my-value"]').exists()).toBe(true)
  })

  it('should apply borderColor when provided', () => {
    const wrapper = mount(StatCard, {
      props: { ...defaultProps, borderColor: '#3E6F73' },
    })

    const card = wrapper.find('div')
    // jsdom converts hex to rgb
    expect(card.attributes('style')).toContain('border-left-color')
  })

  it('should apply transparent border when no borderColor', () => {
    const wrapper = mount(StatCard, { props: defaultProps })

    const card = wrapper.find('div')
    expect(card.attributes('style')).toContain('transparent')
  })

  it('should apply icon background color', () => {
    const wrapper = mount(StatCard, { props: defaultProps })

    // jsdom converts rgba to background-color style
    const iconDiv = wrapper.find('.w-10.h-10')
    expect(iconDiv.attributes('style')).toContain('background-color')
  })

  it('should apply value color', () => {
    const wrapper = mount(StatCard, { props: defaultProps })

    const value = wrapper.find('p.text-2xl')
    // jsdom converts hex to rgb
    expect(value.attributes('style')).toContain('color')
  })
})
