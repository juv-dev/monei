<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, Share, Plus, X } from 'lucide-vue-next'
import { usePwaInstall } from '~/shared/composables/usePwaInstall'

const { canPrompt, isIos, promptInstall, dismiss } = usePwaInstall()

const isVisible = ref(false)
const showIosInstructions = ref(false)

watch(
  canPrompt,
  (val) => {
    if (val) {
      window.setTimeout(() => {
        isVisible.value = canPrompt.value
      }, 1500)
    } else {
      isVisible.value = false
    }
  },
  { immediate: true },
)

async function handleInstall(): Promise<void> {
  if (isIos.value) {
    showIosInstructions.value = true
    return
  }
  const result = await promptInstall()
  if (result === 'accepted' || result === 'dismissed') {
    isVisible.value = false
  }
}

function handleDismiss(): void {
  dismiss()
  isVisible.value = false
  showIosInstructions.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="isVisible && !showIosInstructions"
        class="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm z-50"
        data-testid="install-prompt"
        role="dialog"
        aria-labelledby="install-prompt-title"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 flex items-start gap-3">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style="background: linear-gradient(135deg, #B6A77A 0%, #B6A77ACC 100%);"
            aria-hidden="true"
          >
            <Download :size="20" class="text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <p id="install-prompt-title" class="font-bold text-sm text-slate-900">
              Instalá Monei
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              Accedé más rápido y trabajá offline desde tu pantalla de inicio.
            </p>
            <div class="flex items-center gap-2 mt-3">
              <button
                type="button"
                class="flex-1 py-2 px-3 rounded-lg text-white text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                style="background: linear-gradient(135deg, #B6A77A 0%, #B6A77ACC 100%);"
                data-testid="install-accept-button"
                @click="handleInstall"
              >
                Instalar
              </button>
              <button
                type="button"
                class="py-2 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                data-testid="install-dismiss-button"
                @click="handleDismiss"
              >
                Después
              </button>
            </div>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Cerrar"
            data-testid="install-close-button"
            @click="handleDismiss"
          >
            <X :size="14" />
          </button>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showIosInstructions"
        class="fixed inset-0 z-50 bg-black/40 flex items-end lg:items-center justify-center p-4"
        data-testid="ios-install-instructions"
        role="dialog"
        aria-labelledby="ios-install-title"
        @click.self="handleDismiss"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
          <div class="flex items-start justify-between mb-4">
            <p id="ios-install-title" class="font-bold text-base text-slate-900">
              Instalar en iOS
            </p>
            <button
              type="button"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar instrucciones"
              data-testid="ios-close-button"
              @click="handleDismiss"
            >
              <X :size="16" />
            </button>
          </div>
          <ol class="space-y-3 text-sm text-slate-700">
            <li class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span class="flex items-center gap-1.5 flex-wrap">
                Tocá el botón
                <Share :size="14" class="inline text-blue-500" aria-label="Compartir" />
                <strong>Compartir</strong> en la barra de Safari.
              </span>
            </li>
            <li class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span class="flex items-center gap-1.5 flex-wrap">
                Buscá y tocá
                <Plus :size="14" class="inline text-slate-500" aria-label="Agregar" />
                <strong>Agregar a pantalla de inicio</strong>.
              </span>
            </li>
            <li class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Confirmá con <strong>Agregar</strong>. Vas a ver el ícono de Monei en tu home.</span>
            </li>
          </ol>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
