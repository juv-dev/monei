<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, Mail, Eye, EyeOff, CheckCircle } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const error = ref<string | null>(null)
const isLoading = ref(false)
const successMessage = ref<string | null>(null)

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

async function handleApple(): Promise<void> {
  error.value = null
  isLoading.value = true
  const result = await auth.signInWithApple()
  if (result.error) {
    error.value = result.error
    isLoading.value = false
  }
}

async function handleEmailSubmit(): Promise<void> {
  error.value = null
  successMessage.value = null

  if (!email.value || !password.value) {
    error.value = 'Completá todos los campos'
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
      successMessage.value = 'Te enviamos un correo de verificación. Revisá tu bandeja de entrada.'
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
  <div
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    style="background: #EDEAE3;"
    data-testid="login-page"
  >
    <!-- Decorative blobs -->
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div
        class="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-25"
        style="background: radial-gradient(circle, #C8AA72, transparent 65%)"
      ></div>
      <div
        class="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
        style="background: radial-gradient(circle, #2D9F8F, transparent 65%)"
      ></div>
    </div>

    <div class="relative w-full max-w-[390px]">
      <!-- Card -->
      <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">

        <!-- Brand header -->
        <div
          class="pt-9 pb-7 px-8 text-center"
          style="background: linear-gradient(135deg, #C8AA72 0%, #8A6840 100%)"
        >
          <div
            class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style="background: rgba(255,255,255,0.18)"
          >
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path
                d="M7 30 L7 16 Q7 9 14 9 Q20 9 20 16 Q20 9 27 9 Q33 9 33 16 L33 30"
                stroke="white"
                stroke-width="3.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="27" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <h1 class="text-2xl font-black text-white tracking-tight">monei</h1>
          <p class="text-sm text-white/65 mt-1">Tu dinero, bajo control</p>
        </div>

        <!-- Auth section -->
        <div class="px-8 pt-7 pb-8">
          <p class="text-[15px] font-bold text-[#1A1A2E] text-center mb-6">
            {{ isRegisterMode ? 'Crear cuenta' : 'Acceder a tu cuenta' }}
          </p>

          <!-- Error -->
          <div
            v-if="error"
            class="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-5"
            role="alert"
            data-testid="error-message"
          >
            <AlertCircle :size="15" class="shrink-0" />
            {{ error }}
          </div>

          <!-- Success -->
          <div
            v-if="successMessage"
            class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-5"
            role="status"
            data-testid="success-message"
          >
            <CheckCircle :size="15" class="shrink-0" />
            {{ successMessage }}
          </div>

          <!-- Social buttons -->
          <div class="space-y-2.5">
            <button
              type="button"
              :disabled="isLoading"
              class="w-full flex items-center gap-3 py-3 px-5 rounded-2xl border border-[#E5E0D5] text-sm font-semibold text-[#1A1A2E] bg-white hover:bg-[#F8F6F1] transition-all disabled:opacity-50 shadow-sm"
              data-testid="google-button"
              @click="handleGoogle"
            >
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span class="flex-1 text-center">Continuar con Google</span>
            </button>

            <button
              type="button"
              :disabled="isLoading"
              class="w-full flex items-center gap-3 py-3 px-5 rounded-2xl border border-[#E5E0D5] text-sm font-semibold text-[#1A1A2E] bg-white hover:bg-[#F8F6F1] transition-all disabled:opacity-50 shadow-sm"
              data-testid="apple-button"
              @click="handleApple"
            >
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1A1A2E">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.32 2.99-2.54 4M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span class="flex-1 text-center">Continuar con Apple</span>
            </button>
          </div>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px bg-[#EEEEF0]"></div>
            <span class="text-xs text-[#B0B8C4] font-medium">o</span>
            <div class="flex-1 h-px bg-[#EEEEF0]"></div>
          </div>

          <!-- Email form -->
          <div v-if="showEmailForm">
            <form class="space-y-2.5" @submit.prevent="handleEmailSubmit">
              <input
                v-model="email"
                type="email"
                placeholder="Correo electrónico"
                autocomplete="email"
                class="w-full py-3 px-4 border border-[#E5E0D5] rounded-2xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#C8AA72]/30 focus:border-[#C8AA72] transition-all placeholder:text-[#B0B8C4]"
                data-testid="email-input"
              />
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Contraseña"
                  autocomplete="current-password"
                  class="w-full py-3 px-4 pr-11 border border-[#E5E0D5] rounded-2xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#C8AA72]/30 focus:border-[#C8AA72] transition-all placeholder:text-[#B0B8C4]"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
              <input
                v-if="isRegisterMode"
                v-model="confirmPassword"
                type="password"
                placeholder="Confirmar contraseña"
                autocomplete="new-password"
                class="w-full py-3 px-4 border border-[#E5E0D5] rounded-2xl text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#C8AA72]/30 focus:border-[#C8AA72] transition-all placeholder:text-[#B0B8C4]"
                data-testid="confirm-password-input"
              />
              <button
                type="submit"
                :disabled="isLoading"
                class="w-full py-3 px-4 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-50 shadow-md hover:opacity-90 active:scale-[0.98]"
                style="background: linear-gradient(135deg, #C8AA72 0%, #8A6840 100%)"
                data-testid="email-submit-button"
              >
                {{ isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión' }}
              </button>
            </form>
            <p class="text-xs text-center mt-3 text-[#94A3B8]">
              <button type="button" class="text-[#8A6840] font-semibold hover:underline" @click="toggleMode">
                {{ isRegisterMode ? '¿Ya tenés cuenta? Iniciar sesión' : '¿No tenés cuenta? Registrarte' }}
              </button>
            </p>
          </div>

          <button
            v-else
            type="button"
            :disabled="isLoading"
            class="w-full flex items-center gap-3 py-3 px-5 rounded-2xl border border-[#E5E0D5] text-sm font-semibold text-[#1A1A2E] bg-white hover:bg-[#F8F6F1] transition-all disabled:opacity-50 shadow-sm"
            data-testid="email-button"
            @click="showEmailForm = true"
          >
            <Mail :size="18" class="shrink-0 text-[#94A3B8]" />
            <span class="flex-1 text-center">Continuar con correo</span>
          </button>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-5">
            <div class="flex-1 h-px bg-[#EEEEF0]"></div>
            <span class="text-xs text-[#B0B8C4] font-medium">o</span>
            <div class="flex-1 h-px bg-[#EEEEF0]"></div>
          </div>

          <!-- Demo -->
          <div data-testid="credentials-hint">
            <button
              type="button"
              :disabled="isLoading"
              class="w-full py-3 px-5 rounded-2xl border border-[#E5E0D5] text-sm font-semibold text-[#5A5854] bg-[#F8F6F1] hover:bg-[#F0EDE6] transition-all disabled:opacity-50"
              data-testid="demo-button"
              @click="handleDemo"
            >
              Explorar en modo demo
            </button>
            <p class="text-[11px] text-[#B0B8C4] text-center mt-2">Sin registro — datos de ejemplo en tu navegador</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
