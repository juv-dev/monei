import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from '../../helpers/setup'
import { useAuthStore } from '~/stores/auth'
import { useConfiguracion } from '~/modules/configuracion/composables/useConfiguracion'

describe('useConfiguracion', () => {
  let result: ReturnType<typeof useConfiguracion>
  let authStore: ReturnType<typeof useAuthStore>
  let unmount: () => void

  beforeEach(() => {
    const setup = withSetup(() => useConfiguracion())
    result = setup.result
    unmount = setup.unmount

    authStore = useAuthStore()
    vi.spyOn(authStore, 'changePassword')
  })

  it('should have correct initial state', () => {
    expect(result.isChanging.value).toBe(false)
    expect(result.isSuccess.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('should call auth.changePassword with correct arguments', async () => {
    authStore.changePassword = vi.fn().mockResolvedValue({ success: true })

    const data = { currentPass: 'old123', newPass: 'new456', confirmPass: 'new456' }
    result.changePassword(data)
    await flushPromises()

    expect(authStore.changePassword).toHaveBeenCalledWith('old123', 'new456', 'new456')
  })

  it('should set isSuccess to true after successful password change', async () => {
    authStore.changePassword = vi.fn().mockResolvedValue({ success: true })

    result.changePassword({ currentPass: 'old123', newPass: 'new456', confirmPass: 'new456' })
    await flushPromises()

    expect(result.isSuccess.value).toBe(true)
    expect(result.error.value).toBeNull()
  })

  it('should set error when changePassword fails', async () => {
    authStore.changePassword = vi.fn().mockResolvedValue({ success: false, error: 'msg' })

    result.changePassword({ currentPass: 'old123', newPass: 'new456', confirmPass: 'new456' })
    await flushPromises()

    expect(result.error.value).toBe('msg')
    expect(result.isSuccess.value).toBe(false)
  })

  it('should clear success and error state on reset', async () => {
    authStore.changePassword = vi.fn().mockResolvedValue({ success: false, error: 'msg' })

    result.changePassword({ currentPass: 'old123', newPass: 'new456', confirmPass: 'new456' })
    await flushPromises()

    expect(result.error.value).toBe('msg')

    result.reset()

    expect(result.isSuccess.value).toBe(false)
    expect(result.error.value).toBeNull()
  })
})
