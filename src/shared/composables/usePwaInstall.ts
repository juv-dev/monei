import { ref, computed, onMounted, onBeforeUnmount, readonly } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_KEY = 'monei_install_prompt_dismissed_at'
const DISMISSED_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(false)
  const isIos = ref(false)
  const isStandalone = ref(false)

  function detectStandalone(): boolean {
    if (typeof window === 'undefined') return false
    const mq = window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    return mq || iosStandalone
  }

  function detectIos(): boolean {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent
    const platform = (window.navigator as Navigator & { platform?: string }).platform ?? ''
    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)
  }

  function wasRecentlyDismissed(): boolean {
    if (typeof localStorage === 'undefined') return false
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return false
    const at = Number(raw)
    if (Number.isNaN(at)) return false
    return Date.now() - at < DISMISSED_COOLDOWN_MS
  }

  const canPrompt = computed(() => {
    if (isStandalone.value || isInstalled.value) return false
    if (wasRecentlyDismissed()) return false
    if (isIos.value) return true
    return deferredPrompt.value !== null
  })

  function onBeforeInstall(event: Event): void {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  }

  function onAppInstalled(): void {
    isInstalled.value = true
    deferredPrompt.value = null
  }

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable' | 'ios'> {
    if (isIos.value && !deferredPrompt.value) return 'ios'
    const prompt = deferredPrompt.value
    if (!prompt) return 'unavailable'
    await prompt.prompt()
    const choice = await prompt.userChoice
    deferredPrompt.value = null
    if (choice.outcome === 'dismissed') {
      dismiss()
    }
    return choice.outcome
  }

  function dismiss(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    }
    deferredPrompt.value = null
  }

  onMounted(() => {
    isStandalone.value = detectStandalone()
    isIos.value = detectIos()
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  return {
    canPrompt,
    isIos: readonly(isIos),
    isStandalone: readonly(isStandalone),
    isInstalled: readonly(isInstalled),
    promptInstall,
    dismiss,
  }
}
