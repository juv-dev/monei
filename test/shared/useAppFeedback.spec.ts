import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'

describe('should useAppFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset singleton state
    const { toasts, finishLoading } = useAppFeedback()
    finishLoading()
    toasts.value.splice(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start and finish loading', () => {
    const { isLoading, startLoading, finishLoading } = useAppFeedback()

    expect(isLoading.value).toBe(false)

    startLoading()
    expect(isLoading.value).toBe(true)

    finishLoading()
    expect(isLoading.value).toBe(false)
  })

  it('should set loading color', () => {
    const { loadingColor, startLoading, finishLoading } = useAppFeedback()

    startLoading('#6A1E2D')
    expect(loadingColor.value).toBe('#6A1E2D')
    finishLoading()
  })

  it('should use default loading color', () => {
    const { loadingColor, startLoading, finishLoading } = useAppFeedback()

    startLoading()
    expect(loadingColor.value).toBe('#3E6F73')
    finishLoading()
  })

  it('should add a toast on showToast', () => {
    const { toasts, showToast } = useAppFeedback()

    showToast('Test message')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Test message')
    expect(toasts.value[0].type).toBe('success')
  })

  it('should support error toast type', () => {
    const { toasts, showToast } = useAppFeedback()

    showToast('Error occurred', 'error')

    expect(toasts.value[0].type).toBe('error')
  })

  it('should auto-dismiss toast after 3500ms', () => {
    const { toasts, showToast } = useAppFeedback()

    showToast('Auto dismiss')
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(3500)
    expect(toasts.value).toHaveLength(0)
  })

  it('should dismiss toast manually', () => {
    const { toasts, showToast, dismissToast } = useAppFeedback()

    showToast('Manual dismiss')
    const id = toasts.value[0].id

    dismissToast(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('should handle dismissing non-existent toast gracefully', () => {
    const { toasts, dismissToast } = useAppFeedback()

    dismissToast(99999)
    expect(toasts.value).toHaveLength(0)
  })

  it('should handle multiple toasts', () => {
    const { toasts, showToast } = useAppFeedback()

    showToast('First')
    showToast('Second')
    showToast('Third')

    expect(toasts.value).toHaveLength(3)
  })
})
