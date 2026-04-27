import { ref, computed } from 'vue'

interface FxCache {
  rate: number
  date: string
  updatedAt: string
}

const STORAGE_KEY = 'monei_fx_usd_pen'
const FALLBACK_RATE = 3.75

const rate = ref<number>(FALLBACK_RATE)
const updatedAt = ref<string>('')
const isLoading = ref(false)
const isFallback = ref(true)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadCached(): FxCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FxCache
  } catch {
    return null
  }
}

function saveCached(value: FxCache): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
}

async function fetchLiveRate(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) return null
    const data = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string }
    const pen = data.rates?.PEN
    if (typeof pen !== 'number' || pen <= 0) return null
    return pen
  } catch {
    return null
  }
}

let initPromise: Promise<void> | null = null

async function ensureRate(): Promise<void> {
  const cached = loadCached()
  const today = todayIso()

  if (cached && cached.date === today) {
    rate.value = cached.rate
    updatedAt.value = cached.updatedAt
    isFallback.value = false
    return
  }

  if (cached) {
    rate.value = cached.rate
    updatedAt.value = cached.updatedAt
    isFallback.value = false
  }

  isLoading.value = true
  const live = await fetchLiveRate()
  isLoading.value = false

  if (live != null) {
    rate.value = live
    updatedAt.value = new Date().toISOString()
    isFallback.value = false
    saveCached({ rate: live, date: today, updatedAt: updatedAt.value })
  } else if (!cached) {
    isFallback.value = true
  }
}

export function useExchangeRate() {
  if (!initPromise) initPromise = ensureRate()

  const usdToPen = (usd: number): number => usd * rate.value
  const penToUsd = (pen: number): number => (rate.value > 0 ? pen / rate.value : 0)

  const updatedAtDisplay = computed(() => {
    if (!updatedAt.value) return ''
    try {
      return new Date(updatedAt.value).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  })

  async function refresh(): Promise<void> {
    const live = await fetchLiveRate()
    if (live != null) {
      rate.value = live
      updatedAt.value = new Date().toISOString()
      isFallback.value = false
      saveCached({ rate: live, date: todayIso(), updatedAt: updatedAt.value })
    }
  }

  return { rate, updatedAt, updatedAtDisplay, isLoading, isFallback, usdToPen, penToUsd, refresh }
}
