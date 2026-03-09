<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, Mail, Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const error = ref<string | null>(null)
const isLoading = ref(false)
const successMessage = ref<string | null>(null)

// Email form state
const showEmailForm = ref(false)
const isRegisterMode = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)

async function handleGoogle(): Promise<void> {
  error.value = null
  isLoading.value = true
  const result = await auth.signInWithGoogle()
  if (result.error) {
    error.value = result.error
    isLoading.value = false
  }
}

async function handleGitHub(): Promise<void> {
  error.value = null
  isLoading.value = true
  const result = await auth.signInWithGitHub()
  if (result.error) {
    error.value = result.error
    isLoading.value = false
  }
}

async function handleEmailSubmit(): Promise<void> {
  error.value = null
  successMessage.value = null

  if (!email.value || !password.value) {
    error.value = 'Completa todos los campos'
    return
  }

  if (isRegisterMode.value) {
    if (password.value !== confirmPassword.value) {
      error.value = 'Las contraseñas no coinciden'
      return
    }
    if (password.value.length < 6) {
      error.value = 'La contraseña debe tener al menos 6 caracteres'
      return
    }
    isLoading.value = true
    const result = await auth.signUpWithEmail(email.value, password.value)
    isLoading.value = false
    if (result.error) {
      error.value = result.error
    } else {
      successMessage.value = 'Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada.'
      isRegisterMode.value = false
      password.value = ''
      confirmPassword.value = ''
    }
  } else {
    isLoading.value = true
    const result = await auth.signInWithEmail(email.value, password.value)
    isLoading.value = false
    if (result.error) {
      error.value = result.error
    }
  }
}

async function handleDemo(): Promise<void> {
  isLoading.value = true
  await auth.signInAsDemo()
  isLoading.value = false
  router.push({ name: ROUTE_NAMES.DASHBOARD })
}

function toggleMode(): void {
  isRegisterMode.value = !isRegisterMode.value
  error.value = null
  successMessage.value = null
  password.value = ''
  confirmPassword.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-4" data-testid="login-page">
    <div class="w-full max-w-[380px]">
      <div class="text-center mb-8">
        <svg class="w-12 h-12 mx-auto mb-4" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#B6A77A" />
          <path
            d="M10 30 L16 18 L22 24 L28 12 L34 20"
            stroke="white"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="28" cy="12" r="2" fill="white" />
        </svg>
        <h1 class="text-2xl font-bold text-[#1A1A2E]">Monei</h1>
        <p class="text-sm text-[#94A3B8] mt-1">Tu dinero, bajo control</p>
      </div>

      <div class="bg-white rounded-2xl border border-[#EEEEF0] p-8">
        <h2 class="text-base font-semibold text-[#1A1A2E] mb-6">
          {{ isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión' }}
        </h2>

        <div
          v-if="error"
          class="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4"
          role="alert"
          data-testid="error-message"
        >
          <AlertCircle :size="15" class="shrink-0" />
          {{ error }}
        </div>

        <div
          v-if="successMessage"
          class="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 mb-4"
          role="status"
          data-testid="success-message"
        >
          <Mail :size="15" class="shrink-0" />
          {{ successMessage }}
        </div>

        <div class="space-y-3">
          <button
            type="button"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm font-medium text-[#1A1A2E] bg-white hover:bg-[#F5F6FA] transition-all disabled:opacity-50"
            data-testid="google-button"
            @click="handleGoogle"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>

          <button
            type="button"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm font-medium text-[#1A1A2E] bg-white hover:bg-[#F5F6FA] transition-all disabled:opacity-50"
            data-testid="github-button"
            @click="handleGitHub"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#1A1A2E">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
            Continuar con GitHub
          </button>
        </div>

        <div class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
          <span class="text-xs text-[#94A3B8]">o</span>
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
        </div>

        <!-- Email form -->
        <div v-if="showEmailForm">
          <form class="space-y-3" @submit.prevent="handleEmailSubmit">
            <div>
              <input
                v-model="email"
                type="email"
                placeholder="Correo electrónico"
                autocomplete="email"
                class="w-full py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9F8F]/30 focus:border-[#2D9F8F] transition-all"
                data-testid="email-input"
              />
            </div>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Contraseña"
                autocomplete="current-password"
                class="w-full py-2.5 px-4 pr-10 border border-[#EEEEF0] rounded-xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9F8F]/30 focus:border-[#2D9F8F] transition-all"
                data-testid="password-input"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
            <div v-if="isRegisterMode">
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="Confirmar contraseña"
                autocomplete="new-password"
                class="w-full py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D9F8F]/30 focus:border-[#2D9F8F] transition-all"
                data-testid="confirm-password-input"
              />
            </div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-2.5 px-4 bg-[#2D9F8F] hover:bg-[#268F80] text-white font-medium rounded-xl transition-all text-sm disabled:opacity-50"
              data-testid="email-submit-button"
            >
              {{ isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión' }}
            </button>
          </form>
          <p class="text-xs text-center mt-3">
            <button type="button" class="text-[#2D9F8F] hover:underline" @click="toggleMode">
              {{ isRegisterMode ? 'Ya tengo cuenta' : 'Crear cuenta nueva' }}
            </button>
          </p>
        </div>

        <button
          v-else
          type="button"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm font-medium text-[#1A1A2E] bg-white hover:bg-[#F5F6FA] transition-all disabled:opacity-50"
          data-testid="email-button"
          @click="showEmailForm = true"
        >
          <Mail :size="18" />
          Continuar con correo
        </button>

        <div class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
          <span class="text-xs text-[#94A3B8]">o</span>
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
        </div>

        <div data-testid="credentials-hint">
          <button
            type="button"
            class="w-full py-2.5 px-4 bg-[#F5F6FA] hover:bg-[#EEEEF0] text-[#64748B] font-medium rounded-xl transition-all text-sm border border-[#EEEEF0]"
            data-testid="demo-button"
            @click="handleDemo"
          >
            Probar en modo demo
          </button>
          <p class="text-xs text-[#94A3B8] text-center mt-2">Accede sin crear cuenta — datos locales</p>
        </div>
      </div>
    </div>
  </div>
</template>
