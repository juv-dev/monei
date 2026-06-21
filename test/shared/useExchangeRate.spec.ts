import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const STORAGE_KEY = 'monei_fx_usd_pen'
const FALLBACK_RATE = 3.75

function mockFetchSuccess(rate: number) {
  vi.mocked(globalThis.fetch).mockImplementationOnce(
    async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('open.er-api.com')) {
        return new Response(JSON.stringify({ rates: { PEN: rate } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('Not Found', { status: 404 })
    },
  )
}

function mockFetchFailure() {
  vi.mocked(globalThis.fetch).mockImplementationOnce(
    async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('open.er-api.com')) {
        return new Response('Server Error', { status: 500 })
      }
      return new Response('Not Found', { status: 404 })
    },
  )
}

function mockFetchNetworkError() {
  vi.mocked(globalThis.fetch).mockImplementationOnce(
    async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('open.er-api.com')) {
        throw new Error('Network error')
      }
      return new Response('Not Found', { status: 404 })
    },
  )
}

describe('should useExchangeRate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should use fallback rate and set isFallback when no cache and fetch fails', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(FALLBACK_RATE)
    expect(isFallback.value).toBe(true)
  })

  it('should use fallback rate when network error and no cache', async () => {
    mockFetchNetworkError()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(FALLBACK_RATE)
    expect(isFallback.value).toBe(true)
  })

  it('should fetch live rate and persist to localStorage when no cache exists', async () => {
    mockFetchSuccess(3.82)
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(3.82)
    expect(isFallback.value).toBe(false)
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { rate: number }
    expect(cached.rate).toBe(3.82)
  })

  it('should use cached same-day rate without fetching', async () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rate: 3.9, date: today, updatedAt: new Date().toISOString() }),
    )
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(3.9)
    expect(isFallback.value).toBe(false)
  })

  it('should load stale cache and then fetch live rate', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rate: 3.7, date: '2020-01-01', updatedAt: '2020-01-01T00:00:00.000Z' }),
    )
    mockFetchSuccess(3.85)
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(3.85)
    expect(isFallback.value).toBe(false)
  })

  it('should handle corrupted localStorage JSON gracefully', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(FALLBACK_RATE)
    expect(isFallback.value).toBe(true)
  })

  it('should convert USD to PEN using current rate', async () => {
    mockFetchSuccess(4.0)
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { usdToPen } = useExchangeRate()
    await flushPromises()
    expect(usdToPen(10)).toBe(40)
  })

  it('should convert PEN to USD using current rate', async () => {
    mockFetchSuccess(4.0)
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { penToUsd } = useExchangeRate()
    await flushPromises()
    expect(penToUsd(40)).toBe(10)
  })

  it('should return zero for penToUsd when rate is zero', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, penToUsd } = useExchangeRate()
    await flushPromises()
    rate.value = 0
    expect(penToUsd(100)).toBe(0)
  })

  it('should return empty string for updatedAtDisplay when updatedAt is empty', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { updatedAt, updatedAtDisplay } = useExchangeRate()
    await flushPromises()
    updatedAt.value = ''
    expect(updatedAtDisplay.value).toBe('')
  })

  it('should format updatedAtDisplay as locale date string', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { updatedAt, updatedAtDisplay } = useExchangeRate()
    await flushPromises()
    updatedAt.value = '2024-06-15T00:00:00.000Z'
    expect(updatedAtDisplay.value.length).toBeGreaterThan(0)
  })

  it('should update rate when refresh is called and fetch succeeds', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, isFallback, refresh } = useExchangeRate()
    await flushPromises()
    expect(isFallback.value).toBe(true)

    mockFetchSuccess(3.95)
    await refresh()

    expect(rate.value).toBe(3.95)
    expect(isFallback.value).toBe(false)
  })

  it('should not update rate when refresh is called and fetch fails', async () => {
    mockFetchSuccess(3.8)
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { rate, refresh } = useExchangeRate()
    await flushPromises()
    expect(rate.value).toBe(3.8)

    mockFetchFailure()
    await refresh()

    expect(rate.value).toBe(3.8)
  })

  it('should persist refreshed rate to localStorage', async () => {
    mockFetchFailure()
    const { useExchangeRate } = await import('~/shared/composables/useExchangeRate')
    const { refresh } = useExchangeRate()
    await flushPromises()

    mockFetchSuccess(4.1)
    await refresh()

    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { rate: number }
    expect(cached.rate).toBe(4.1)
  })
})
