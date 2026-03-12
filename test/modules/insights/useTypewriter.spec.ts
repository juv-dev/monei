import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { withSetup } from '../../helpers/setup'
import { useTypewriter } from '~/modules/insights/composables/useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displayText and isTyping should be empty/false initially', () => {
    const { result } = withSetup(() => useTypewriter())

    expect(result.displayText.value).toBe('')
    expect(result.isTyping.value).toBe(false)
  })

  it('type() should set isTyping to true and start typing', () => {
    const { result } = withSetup(() => useTypewriter())

    result.type('Hello')

    expect(result.isTyping.value).toBe(true)
    expect(result.displayText.value).toBe('H')
  })

  it('type() should complete and resolve after all characters typed', async () => {
    const speed = 20
    const text = 'Hello'
    const { result } = withSetup(() => useTypewriter(speed))

    const promise = result.type(text)

    // Advance timers to type all remaining characters
    vi.advanceTimersByTime(speed * text.length)

    await promise

    expect(result.displayText.value).toBe(text)
    expect(result.isTyping.value).toBe(false)
  })

  it('stop() should stop typing mid-stream and set isTyping to false', () => {
    const speed = 20
    const { result } = withSetup(() => useTypewriter(speed))

    result.type('Hello World')

    // Advance a few characters
    vi.advanceTimersByTime(speed * 3)

    expect(result.isTyping.value).toBe(true)
    expect(result.displayText.value).toBe('Hell')

    result.stop()

    expect(result.isTyping.value).toBe(false)

    // Advance more time and verify no additional characters are typed
    const stoppedText = result.displayText.value
    vi.advanceTimersByTime(speed * 10)
    expect(result.displayText.value).toBe(stoppedText)
  })

  it('skipToEnd() should immediately show the full text and set isTyping to false', () => {
    const speed = 20
    const text = 'Hello World'
    const { result } = withSetup(() => useTypewriter(speed))

    result.type(text)

    // Advance only a couple characters
    vi.advanceTimersByTime(speed * 2)

    expect(result.displayText.value).not.toBe(text)

    result.skipToEnd(text)

    expect(result.displayText.value).toBe(text)
    expect(result.isTyping.value).toBe(false)
  })

  it('unmount should stop typing', () => {
    const speed = 20
    const { result, unmount } = withSetup(() => useTypewriter(speed))

    result.type('Hello World')

    // Advance a few characters
    vi.advanceTimersByTime(speed * 3)

    expect(result.isTyping.value).toBe(true)

    unmount()

    expect(result.isTyping.value).toBe(false)

    // Verify no additional characters are typed after unmount
    const stoppedText = result.displayText.value
    vi.advanceTimersByTime(speed * 10)
    expect(result.displayText.value).toBe(stoppedText)
  })
})
