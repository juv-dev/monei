import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import OnboardingModal from '~/modules/demo/components/OnboardingModal.vue'
import { createTestQueryClient, createTestRouter } from '../../helpers/setup'

describe('OnboardingModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.body.innerHTML = ''
  })

  function mountModal() {
    const queryClient = createTestQueryClient()
    const router = createTestRouter()
    const wrapper = mount(OnboardingModal, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }], router],
      },
      attachTo: document.body,
    })
    return { wrapper }
  }

  function bodyText() {
    return document.body.textContent ?? ''
  }

  function findButton(text: string): HTMLButtonElement | null {
    const buttons = document.body.querySelectorAll('button')
    for (const btn of buttons) {
      if (btn.textContent?.includes(text)) return btn
    }
    return null
  }

  async function clickButton(text: string) {
    const btn = findButton(text)
    btn?.click()
    await flushPromises()
  }

  it('renders the first step initially with title "Bienvenido a Monei"', () => {
    mountModal()
    expect(bodyText()).toContain('Bienvenido a Monei')
  })

  it('clicking "Siguiente" advances to step 2', async () => {
    mountModal()

    await clickButton('Siguiente')

    expect(bodyText()).toContain('Datos de ejemplo cargados')
  })

  it('"Anterior" button is hidden on the first step', () => {
    mountModal()
    expect(findButton('Anterior')).toBeNull()
  })

  it('"Anterior" button appears on step 2 and navigates back', async () => {
    mountModal()

    await clickButton('Siguiente')
    expect(findButton('Anterior')).not.toBeNull()

    await clickButton('Anterior')
    expect(bodyText()).toContain('Bienvenido a Monei')
  })

  it('clicking through all steps to the last shows "Empezar" button text', async () => {
    mountModal()

    for (let i = 0; i < 4; i++) {
      await clickButton('Siguiente')
    }

    expect(findButton('Empezar')).not.toBeNull()
    expect(findButton('Siguiente')).toBeNull()
    expect(bodyText()).toContain('Insights inteligentes')
  })

  it('clicking "Empezar" on last step emits "close" and sets localStorage', async () => {
    const { wrapper } = mountModal()

    for (let i = 0; i < 4; i++) {
      await clickButton('Siguiente')
    }

    await clickButton('Empezar')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(localStorage.getItem('monei_demo_onboarding_done')).toBe('1')
  })

  it('close button (X) emits "close" and sets localStorage', async () => {
    const { wrapper } = mountModal()

    // Find the X close button (doesn't contain navigation text)
    const buttons = document.body.querySelectorAll('button')
    let closeBtn: HTMLButtonElement | null = null
    for (const btn of buttons) {
      const text = btn.textContent ?? ''
      if (!text.includes('Siguiente') && !text.includes('Anterior') && !text.includes('Empezar')) {
        closeBtn = btn
        break
      }
    }
    closeBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(localStorage.getItem('monei_demo_onboarding_done')).toBe('1')
  })

  it('progress bar width updates with each step', async () => {
    mountModal()

    function getProgressWidth() {
      const bar = document.body.querySelector('.h-1 > div') as HTMLElement | null
      return bar?.style.width ?? ''
    }

    expect(getProgressWidth()).toBe('20%')

    await clickButton('Siguiente')
    expect(getProgressWidth()).toBe('40%')

    await clickButton('Siguiente')
    expect(getProgressWidth()).toBe('60%')

    await clickButton('Siguiente')
    expect(getProgressWidth()).toBe('80%')

    await clickButton('Siguiente')
    expect(getProgressWidth()).toBe('100%')
  })
})
