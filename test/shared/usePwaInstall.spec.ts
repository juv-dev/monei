import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../helpers/setup'
import { usePwaInstall } from '~/shared/composables/usePwaInstall'

function makeDeferredPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome, platform: 'web' })
  return event
}

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
    Object.defineProperty(window.navigator, 'platform', {
      writable: true,
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: undefined,
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

  it('should return unavailable when no deferred prompt and not iOS', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    const outcome = await result.promptInstall()
    expect(outcome).toBe('unavailable')
    unmount()
  })

  it('should set canPrompt true after beforeinstallprompt event', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    const promptEvent = makeDeferredPromptEvent('accepted')
    window.dispatchEvent(promptEvent)

    expect(result.canPrompt.value).toBe(true)
    unmount()
  })

  it('should return accepted when user accepts install prompt', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    const promptEvent = makeDeferredPromptEvent('accepted')
    window.dispatchEvent(promptEvent)

    const outcome = await result.promptInstall()
    expect(outcome).toBe('accepted')
    expect(promptEvent.prompt).toHaveBeenCalled()
    unmount()
  })

  it('should return dismissed and store timestamp when user dismisses install prompt', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    const promptEvent = makeDeferredPromptEvent('dismissed')
    window.dispatchEvent(promptEvent)

    const outcome = await result.promptInstall()
    expect(outcome).toBe('dismissed')
    expect(localStorage.getItem('monei_install_prompt_dismissed_at')).not.toBeNull()
    unmount()
  })

  it('should clear deferred prompt after promptInstall', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    const promptEvent = makeDeferredPromptEvent('accepted')
    window.dispatchEvent(promptEvent)
    expect(result.canPrompt.value).toBe(true)

    await result.promptInstall()
    expect(result.canPrompt.value).toBe(false)
    unmount()
  })

  it('should mark isInstalled true after appinstalled event', async () => {
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()

    window.dispatchEvent(new Event('appinstalled'))

    expect(result.isInstalled.value).toBe(true)
    expect(result.canPrompt.value).toBe(false)
    unmount()
  })

  it('should remove event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = withSetup(() => usePwaInstall())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })

  it('should allow canPrompt when dismiss timestamp is older than cooldown', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem('monei_install_prompt_dismissed_at', String(eightDaysAgo))

    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    expect(result.canPrompt.value).toBe(true)
    unmount()
  })

  it('should detect iOS via MacIntel platform with maxTouchPoints heuristic', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0)',
    })
    Object.defineProperty(window.navigator, 'platform', {
      writable: true,
      configurable: true,
      value: 'MacIntel',
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    })
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    expect(result.isIos.value).toBe(true)
    unmount()
  })

  it('should treat non-numeric dismiss timestamp as not dismissed', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
    })
    localStorage.setItem('monei_install_prompt_dismissed_at', 'not-a-timestamp')
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    expect(result.canPrompt.value).toBe(true)
    unmount()
  })

  it('should detect standalone when navigator.standalone is true', async () => {
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      configurable: true,
      value: true,
    })
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    expect(result.isStandalone.value).toBe(true)
    unmount()
  })

  it('should return false for MacIntel platform with undefined maxTouchPoints', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0)',
    })
    Object.defineProperty(window.navigator, 'platform', {
      writable: true,
      configurable: true,
      value: 'MacIntel',
    })
    const { result, unmount } = withSetup(() => usePwaInstall())
    await flushPromises()
    expect(result.isIos.value).toBe(false)
    unmount()
  })
})
