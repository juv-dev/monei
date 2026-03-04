import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CurrencyInput from '~/shared/components/ui/CurrencyInput.vue'

describe('should CurrencyInput', () => {
  it('should render with default placeholder', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '' },
    })

    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('0.00')
  })

  it('should render custom placeholder', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '', placeholder: '1,000' },
    })

    expect(wrapper.find('input').attributes('placeholder')).toBe('1,000')
  })

  it('should render label when provided', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '', label: 'Monto (S/)' },
    })

    expect(wrapper.find('label').text()).toBe('Monto (S/)')
  })

  it('should not render label when not provided', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '' },
    })

    expect(wrapper.find('label').exists()).toBe(false)
  })

  it('should display the modelValue', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '1500' },
    })

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('1500')
  })

  it('should apply data-testid', () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '', testid: 'amount-input' },
    })

    expect(wrapper.find('[data-testid="amount-input"]').exists()).toBe(true)
  })

  it('should emit update:modelValue on input', async () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '' },
    })

    await wrapper.find('input').setValue('500')
    // The component uses onDecimalInput which strips non-numeric chars
    // setValue triggers input event
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should format value on blur', async () => {
    const wrapper = mount(CurrencyInput, {
      props: { modelValue: '1000' },
    })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('blur')

    // Should emit formatted value
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
})
