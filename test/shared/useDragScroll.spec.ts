import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { withSetup } from '../helpers/setup'
import { useDragScroll } from '~/shared/composables/useDragScroll'

function createScrollableElement() {
  const el = document.createElement('div')
  let scrollLeftValue = 0

  Object.defineProperty(el, 'scrollLeft', {
    get: () => scrollLeftValue,
    set: (v: number) => {
      scrollLeftValue = v
    },
    configurable: true,
  })
  Object.defineProperty(el, 'scrollWidth', { get: () => 500, configurable: true })
  Object.defineProperty(el, 'clientWidth', { get: () => 200, configurable: true })

  el.setPointerCapture = vi.fn()
  el.releasePointerCapture = vi.fn()

  document.body.appendChild(el)
  return el
}

describe('should useDragScroll', () => {
  let el: HTMLDivElement

  beforeEach(() => {
    el = createScrollableElement()
  })

  afterEach(() => {
    if (document.body.contains(el)) {
      document.body.removeChild(el)
    }
  })

  it('should attach event listeners to element on mount', () => {
    const addSpy = vi.spyOn(el, 'addEventListener')
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))
    expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })
    unmount()
  })

  it('should remove event listeners on unmount', () => {
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('wheel', expect.any(Function))
  })

  it('should set grabbing cursor and capture pointer on pointerdown', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))

    expect(el.style.cursor).toBe('grabbing')
    expect(el.style.userSelect).toBe('none')
    expect(el.setPointerCapture).toHaveBeenCalledWith(1)
    unmount()
  })

  it('should scroll when pointer moves after pointerdown', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 80, bubbles: true }))

    expect(el.scrollLeft).toBe(20)
    unmount()
  })

  it('should not scroll when pointermove fires without prior pointerdown', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 80, bubbles: true }))

    expect(el.scrollLeft).toBe(0)
    unmount()
  })

  it('should release capture and reset cursor on pointerup', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, bubbles: true }))

    expect(el.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(el.style.cursor).toBe('')
    expect(el.style.userSelect).toBe('')
    unmount()
  })

  it('should stop scrolling after pointerup', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 50, bubbles: true }))

    expect(el.scrollLeft).toBe(0)
    unmount()
  })

  it('should handle pointercancel the same as pointerup', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 100, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2, clientX: 100, bubbles: true }))

    expect(el.releasePointerCapture).toHaveBeenCalledWith(2)
    unmount()
  })

  it('should scroll horizontally on wheel deltaY when content overflows', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 50, deltaX: 0, bubbles: true, cancelable: true }))

    expect(el.scrollLeft).toBe(50)
    unmount()
  })

  it('should use deltaX when deltaY is zero on wheel', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 0, deltaX: 30, bubbles: true, cancelable: true }))

    expect(el.scrollLeft).toBe(30)
    unmount()
  })

  it('should not scroll on wheel when content does not overflow', () => {
    Object.defineProperty(el, 'scrollWidth', { get: () => 200, configurable: true })
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 50, bubbles: true }))

    expect(el.scrollLeft).toBe(0)
    unmount()
  })

  it('should not fail when elRef is null on mount', () => {
    const elRef = ref<HTMLElement | null>(null)
    expect(() => {
      const { unmount } = withSetup(() => useDragScroll(elRef))
      unmount()
    }).not.toThrow()
  })

  it('should not fail when elRef becomes null on unmount', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))
    elRef.value = null
    expect(() => unmount()).not.toThrow()
  })

  it('should handle null elRef during pointermove while dragging', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    elRef.value = null
    expect(() => {
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 80, bubbles: true }))
    }).not.toThrow()

    unmount()
  })

  it('should handle null elRef during pointerup while dragging', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    elRef.value = null
    expect(() => {
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, bubbles: true }))
    }).not.toThrow()

    unmount()
  })

  it('should handle null elRef during pointercancel while dragging', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 50, bubbles: true }))
    elRef.value = null
    expect(() => {
      el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2, bubbles: true }))
    }).not.toThrow()

    unmount()
  })

  it('should handle null elRef on pointerdown', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    elRef.value = null
    expect(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }))
    }).not.toThrow()

    unmount()
  })

  it('should not fail when pointerup fires without prior pointerdown', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    expect(() => {
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }))
    }).not.toThrow()

    expect(el.scrollLeft).toBe(0)
    unmount()
  })

  it('should handle null elRef during wheel event', () => {
    const elRef = ref<HTMLElement | null>(el)
    const { unmount } = withSetup(() => useDragScroll(elRef))

    elRef.value = null
    expect(() => {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: 50, bubbles: true, cancelable: true }))
    }).not.toThrow()

    unmount()
  })
})
