import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../helpers/setup'
import { usePwaInstall } from '~/shared/composables/usePwaInstall'

describe('should usePwaInstall', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    })
  })

  it('should expose initial state with canPrompt false when no deferred event and not iOS', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    expect(result.canPrompt.value).toBe(false)
    expect(result.isIos.value).toBe(false)
    expect(result.isStandalone.value).toBe(false)
    expect(result.isInstalled.value).toBe(false)
    unmount()
  })

  it('should detect iOS via userAgent and allow canPrompt', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })

    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    expect(result.isIos.value).toBe(true)
    expect(result.canPrompt.value).toBe(true)
    unmount()
  })

  it('should not allow canPrompt when standalone is true', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })

    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    expect(result.isStandalone.value).toBe(true)
    expect(result.canPrompt.value).toBe(false)
    unmount()
  })

  it('should persist dismiss timestamp in localStorage', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    result.dismiss()
    const stored = localStorage.getItem('monei_install_prompt_dismissed_at')

    expect(stored).not.toBeNull()
    expect(Number.isNaN(Number(stored))).toBe(false)
    unmount()
  })

  it('should not prompt again within cooldown window after dismiss', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })
    localStorage.setItem('monei_install_prompt_dismissed_at', String(Date.now()))

    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    expect(result.canPrompt.value).toBe(false)
    unmount()
  })

  it('should return ios result when promptInstall called on iOS without deferred event', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })

    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    const outcome = await result.promptInstall()
    expect(outcome).toBe('ios')
    unmount()
  })
})
