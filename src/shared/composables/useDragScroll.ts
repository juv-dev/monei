import { onMounted, onUnmounted, type Ref } from 'vue'

export function useDragScroll(elRef: Ref<HTMLElement | null>): void {
  let dragging = false
  let startX = 0
  let scrollLeft = 0

  function onPointerDown(e: PointerEvent): void {
    const el = elRef.value
    if (!el) return
    dragging = true
    startX = e.clientX
    scrollLeft = el.scrollLeft
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return
    const el = elRef.value
    if (!el) return
    el.scrollLeft = scrollLeft - (e.clientX - startX)
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return
    dragging = false
    const el = elRef.value
    if (!el) return
    el.releasePointerCapture(e.pointerId)
    el.style.cursor = ''
    el.style.userSelect = ''
  }

  function onWheel(e: WheelEvent): void {
    const el = elRef.value
    if (!el || el.scrollWidth <= el.clientWidth) return
    e.preventDefault()
    el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX
  }

  onMounted(() => {
    const el = elRef.value
    if (!el) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })
  })

  onUnmounted(() => {
    const el = elRef.value
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
    el.removeEventListener('wheel', onWheel)
  })
}
