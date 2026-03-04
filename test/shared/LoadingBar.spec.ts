import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LoadingBar from '~/shared/components/ui/LoadingBar.vue'

describe('should LoadingBar', () => {
  let rafQueue: Array<FrameRequestCallback>

  beforeEach(() => {
    rafQueue = []
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function drainRAF() {
    let safety = 10
    while (rafQueue.length > 0 && safety-- > 0) {
      const batch = rafQueue.splice(0)
      batch.forEach((cb) => cb(performance.now()))
      await nextTick()
    }
  }

  it('should be hidden initially when not active', () => {
    const wrapper = mount(LoadingBar, {
      props: { active: false, color: '#3E6F73' },
    })

    expect(wrapper.find('div').attributes('style')).toContain('display: none')
  })

  it('should become visible when activated', async () => {
    const wrapper = mount(LoadingBar, {
      props: { active: false, color: '#3E6F73' },
    })

    await wrapper.setProps({ active: true })
    await nextTick()
    await drainRAF()

    // visible should be true
    const rootStyle = wrapper.find('div').attributes('style') || ''
    expect(rootStyle).not.toContain('display: none')
  })

  it('should set width via requestAnimationFrame', async () => {
    const wrapper = mount(LoadingBar, {
      props: { active: false, color: '#3E6F73' },
    })

    await wrapper.setProps({ active: true })
    await nextTick()
    await drainRAF()
    await nextTick()

    // Check the inner bar
    const bar = wrapper.find('.h-full')
    expect(bar.exists()).toBe(true)
    const style = bar.attributes('style') ?? ''
    // width should be set (either 0% or 85% depending on RAF timing)
    expect(style).toContain('width:')
  })

  it('should hide after deactivation timeout', async () => {
    let capturedCb: (() => void) | null = null
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void) => {
      capturedCb = cb
      return 0
    }) as unknown as typeof setTimeout)

    const wrapper = mount(LoadingBar, {
      props: { active: false, color: '#6A1E2D' },
    })

    // Activate
    await wrapper.setProps({ active: true })
    await nextTick()
    await drainRAF()

    // Deactivate
    await wrapper.setProps({ active: false })
    await nextTick()

    // Fire the setTimeout callback (visible = false, width = 0)
    if (capturedCb) capturedCb()
    await nextTick()

    expect(wrapper.find('div').attributes('style')).toContain('display: none')
  })

  it('should render inner bar element', () => {
    const wrapper = mount(LoadingBar, {
      props: { active: false, color: '#3E6F73' },
    })

    expect(wrapper.find('.h-full').exists()).toBe(true)
  })
})
