import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import InstallPrompt from '~/shared/components/ui/InstallPrompt.vue'
import { usePwaInstall } from '~/shared/composables/usePwaInstall'

vi.mock('~/shared/composables/usePwaInstall', () => ({
  usePwaInstall: vi.fn(),
}))

describe('should InstallPrompt', () => {
  let wrapper: VueWrapper

  const mockDismiss = vi.fn()
  const mockPromptInstall = vi.fn()

  function mountComponent(overrides: { canPrompt?: boolean; isIos?: boolean } = {}) {
    vi.mocked(usePwaInstall).mockReturnValue({
      canPrompt: ref(overrides.canPrompt ?? false),
      isIos: ref(overrides.isIos ?? false),
      promptInstall: mockPromptInstall,
      dismiss: mockDismiss,
    } as any)
    wrapper = mount(InstallPrompt, {
      attachTo: document.body,
      global: { stubs: { Transition: true } },
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('should not show install prompt when canPrompt is false', async () => {
    mountComponent({ canPrompt: false })
    await nextTick()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
  })

  it('should show install prompt after 1500ms delay when canPrompt is true', async () => {
    mountComponent({ canPrompt: true })
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).not.toBeNull()
  })

  it('should call dismiss and hide prompt when install-dismiss-button is clicked', async () => {
    mountComponent({ canPrompt: true })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-dismiss-button"]') as HTMLElement).click()
    await nextTick()
    expect(mockDismiss).toHaveBeenCalledOnce()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
  })

  it('should call dismiss and hide prompt when install-close-button is clicked', async () => {
    mountComponent({ canPrompt: true })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-close-button"]') as HTMLElement).click()
    await nextTick()
    expect(mockDismiss).toHaveBeenCalledOnce()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
  })

  it('should call promptInstall and hide prompt when install-accept-button clicked and result is accepted', async () => {
    mockPromptInstall.mockResolvedValue('accepted')
    mountComponent({ canPrompt: true, isIos: false })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-accept-button"]') as HTMLElement).click()
    await nextTick()
    await nextTick()
    expect(mockPromptInstall).toHaveBeenCalledOnce()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
  })

  it('should call promptInstall and hide prompt when result is dismissed', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    mountComponent({ canPrompt: true, isIos: false })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-accept-button"]') as HTMLElement).click()
    await nextTick()
    await nextTick()
    expect(mockPromptInstall).toHaveBeenCalledOnce()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
  })

  it('should show iOS instructions when isIos is true and install button clicked', async () => {
    mountComponent({ canPrompt: true, isIos: true })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-accept-button"]') as HTMLElement).click()
    await nextTick()
    expect(document.body.querySelector('[data-testid="ios-install-instructions"]')).not.toBeNull()
  })

  it('should call dismiss and close iOS instructions when ios-close-button clicked', async () => {
    mountComponent({ canPrompt: true, isIos: true })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-accept-button"]') as HTMLElement).click()
    await nextTick()
    ;(document.body.querySelector('[data-testid="ios-close-button"]') as HTMLElement).click()
    await nextTick()
    expect(mockDismiss).toHaveBeenCalledOnce()
    expect(document.body.querySelector('[data-testid="ios-install-instructions"]')).toBeNull()
  })

  it('should not show main prompt when iOS instructions are showing', async () => {
    mountComponent({ canPrompt: true, isIos: true })
    vi.advanceTimersByTime(1500)
    await nextTick()
    ;(document.body.querySelector('[data-testid="install-accept-button"]') as HTMLElement).click()
    await nextTick()
    expect(document.body.querySelector('[data-testid="install-prompt"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="ios-install-instructions"]')).not.toBeNull()
  })
})
