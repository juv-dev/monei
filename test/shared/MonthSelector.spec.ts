import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'
import MonthSelector from '~/shared/components/ui/MonthSelector.vue'

vi.mock('~/shared/composables/useSelectedMonth')

type MockComposable = {
  selectedYear: Ref<number>
  selectedMonth: Ref<number>
  isCurrentMonth: ComputedRef<boolean>
  monthLabel: ComputedRef<string>
  prevMonth: () => void
  nextMonth: () => void
}

const createMockComposable = (overrides: Partial<MockComposable> = {}): MockComposable => ({
  selectedYear: ref(2024),
  selectedMonth: ref(6),
  isCurrentMonth: computed(() => false),
  monthLabel: computed(() => 'June 2024'),
  prevMonth: vi.fn(),
  nextMonth: vi.fn(),
  ...overrides,
})

describe('should MonthSelector', () => {
  beforeEach(() => {
    vi.mocked(useSelectedMonth).mockReturnValue(createMockComposable())
  })

  it('should render monthLabel text in the span', () => {
    const wrapper = mount(MonthSelector)
    expect(wrapper.find('span').text()).toBe('June 2024')
  })

  it('should call prevMonth when prev button is clicked', async () => {
    const prevMonth = vi.fn()
    vi.mocked(useSelectedMonth).mockReturnValue(createMockComposable({ prevMonth }))
    const wrapper = mount(MonthSelector)
    await wrapper.find('[aria-label="Mes anterior"]').trigger('click')
    expect(prevMonth).toHaveBeenCalledOnce()
  })

  it('should call nextMonth when next button is clicked and isCurrentMonth is false', async () => {
    const nextMonth = vi.fn()
    vi.mocked(useSelectedMonth).mockReturnValue(
      createMockComposable({ isCurrentMonth: computed(() => false), nextMonth }),
    )
    const wrapper = mount(MonthSelector)
    await wrapper.find('[aria-label="Mes siguiente"]').trigger('click')
    expect(nextMonth).toHaveBeenCalledOnce()
  })

  it('should disable next month button when isCurrentMonth is true', () => {
    vi.mocked(useSelectedMonth).mockReturnValue(
      createMockComposable({ isCurrentMonth: computed(() => true) }),
    )
    const wrapper = mount(MonthSelector)
    const nextBtn = wrapper.find('[aria-label="Mes siguiente"]')
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should not disable next month button when isCurrentMonth is false', () => {
    vi.mocked(useSelectedMonth).mockReturnValue(
      createMockComposable({ isCurrentMonth: computed(() => false) }),
    )
    const wrapper = mount(MonthSelector)
    const nextBtn = wrapper.find('[aria-label="Mes siguiente"]')
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('should apply cursor-not-allowed class when isCurrentMonth is true', () => {
    vi.mocked(useSelectedMonth).mockReturnValue(
      createMockComposable({ isCurrentMonth: computed(() => true) }),
    )
    const wrapper = mount(MonthSelector)
    expect(wrapper.find('[aria-label="Mes siguiente"]').classes()).toContain('cursor-not-allowed')
  })

  it('should have aria-label Mes anterior on prev button', () => {
    const wrapper = mount(MonthSelector)
    expect(wrapper.find('[aria-label="Mes anterior"]').exists()).toBe(true)
  })

  it('should have aria-label Mes siguiente on next button', () => {
    const wrapper = mount(MonthSelector)
    expect(wrapper.find('[aria-label="Mes siguiente"]').exists()).toBe(true)
  })
})
