<script setup lang="ts">
import { computed } from 'vue'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-vue-next'
import { useNetworkStatus, clearAuthNetworkError } from '~/shared/composables/useNetworkStatus'

const { isOnline, hasAuthError, reconnectedFlash } = useNetworkStatus()

type BannerState = 'offline' | 'auth-error' | 'reconnected' | null

const state = computed<BannerState>(() => {
  if (!isOnline.value) return 'offline'
  if (hasAuthError.value) return 'auth-error'
  if (reconnectedFlash.value) return 'reconnected'
  return null
})

function retry() {
  clearAuthNetworkError()
  window.location.reload()
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="state"
      class="fixed top-0 inset-x-0 z-[100] flex justify-center pt-3 px-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        class="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium max-w-md backdrop-blur-md"
        :class="{
          'bg-rose-50/95 border-rose-200 text-rose-800': state === 'offline',
          'bg-amber-50/95 border-amber-200 text-amber-900': state === 'auth-error',
          'bg-emerald-50/95 border-emerald-200 text-emerald-800': state === 'reconnected',
        }"
      >
        <WifiOff v-if="state === 'offline'" :size="15" class="shrink-0" />
        <RefreshCw v-else-if="state === 'auth-error'" :size="15" class="shrink-0" />
        <CheckCircle2 v-else :size="15" class="shrink-0" />

        <span v-if="state === 'offline'">Sin conexión. Reintentando al volver la red...</span>
        <span v-else-if="state === 'auth-error'">Problema de conexión con el servicio de autenticación.</span>
        <span v-else>Conexión restablecida</span>

        <button
          v-if="state === 'auth-error'"
          type="button"
          class="ml-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-900 text-amber-50 hover:bg-amber-950 transition-colors shrink-0"
          @click="retry"
        >
          Reintentar
        </button>
      </div>
    </div>
  </Transition>
</template>
