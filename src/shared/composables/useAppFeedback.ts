import { ref } from 'vue'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

// Module-level singleton state (shared across all components)
const isLoading = ref(false)
const loadingColor = ref('#3E6F73')
const toasts = ref<Toast[]>([])
let nextId = 0

export function useAppFeedback() {
  function startLoading(color = '#3E6F73') {
    loadingColor.value = color
    isLoading.value = true
  }

  function finishLoading() {
    isLoading.value = false
  }

  function showToast(message: string, type: ToastType = 'success') {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => dismissToast(id), 3500)
  }

  function dismissToast(id: number) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return { isLoading, loadingColor, toasts, startLoading, finishLoading, showToast, dismissToast }
}
