<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogOut, Shield, Mail, User as UserIcon, Settings2, ExternalLink, DollarSign } from 'lucide-vue-next'
import { useClerk } from '@clerk/vue'
import { useAuthStore } from '~/stores/auth'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const clerk = useClerk()
const { rate: fxRate, isFallback: fxFallback, updatedAtDisplay, refresh: fxRefresh, isLoading: fxLoading } = useExchangeRate()


const providerLabel: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  demo: 'Demo',
}

const isDemo = auth.currentUser?.provider === 'demo'

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: ROUTE_NAMES.LOGIN })
}

function openClerkProfile(): void {
  clerk.value?.openUserProfile()
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F6F1]" data-testid="configuracion-view">
    <div class="max-w-2xl mx-auto p-5 lg:p-8 space-y-5">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">Configuración</h1>
        <p class="text-sm text-[#64748B] mt-0.5">Gestiona tu cuenta y preferencias</p>
      </div>

      <!-- Profile card -->
      <div
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #b6a77a 0%, #8a7050 100%)"
      >
        <div class="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-[0.08]" style="background: white"></div>
        <div class="absolute -bottom-14 -left-6 w-52 h-52 rounded-full opacity-[0.05]" style="background: white"></div>

        <div class="relative z-10 flex items-center gap-5">
          <img
            v-if="auth.currentUser?.avatarUrl"
            :src="auth.currentUser.avatarUrl"
            :alt="auth.currentUser.displayName"
            class="w-16 h-16 rounded-2xl object-cover shrink-0"
            data-testid="user-avatar"
          />
          <div
            v-else
            class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-black shrink-0"
            data-testid="user-initial"
          >
            {{ auth.currentUser?.displayName.charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-white text-xl font-black" data-testid="user-display-name">
              {{ auth.currentUser?.displayName }}
            </p>
            <p class="text-white/60 text-sm mt-0.5 truncate" data-testid="user-email">{{ auth.currentUser?.username }}</p>
            <span
              class="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold bg-white/20 text-white rounded-full px-3 py-1"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white/80 inline-block"></span>
              Sesión activa
            </span>
          </div>
        </div>
      </div>

      <!-- Account info -->
      <div class="bg-white rounded-2xl shadow-sm border border-[#EEEEF0] overflow-hidden">
        <div class="flex items-center gap-3 px-6 py-5 border-b border-[#F0F2F5]">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style="background: rgba(182, 167, 122, 0.15)"
          >
            <Shield :size="18" style="color: #8a7050" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#1A1A2E]">Información de la cuenta</h2>
            <p class="text-xs text-[#94A3B8] mt-0.5">Detalles de tu sesión actual</p>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <UserIcon :size="16" class="text-[#94A3B8] shrink-0" aria-hidden="true" />
            <div>
              <p class="text-xs text-[#94A3B8] uppercase tracking-wide font-semibold">Nombre</p>
              <p class="text-sm text-[#1A1A2E] font-medium" data-testid="info-name">
                {{ auth.currentUser?.displayName }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Mail :size="16" class="text-[#94A3B8] shrink-0" aria-hidden="true" />
            <div>
              <p class="text-xs text-[#94A3B8] uppercase tracking-wide font-semibold">Correo</p>
              <p class="text-sm text-[#1A1A2E] font-medium" data-testid="info-email">
                {{ auth.currentUser?.username }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Shield :size="16" class="text-[#94A3B8] shrink-0" aria-hidden="true" />
            <div>
              <p class="text-xs text-[#94A3B8] uppercase tracking-wide font-semibold">Proveedor</p>
              <p class="text-sm text-[#1A1A2E] font-medium" data-testid="info-provider">
                {{ providerLabel[auth.currentUser?.provider ?? ''] ?? 'Desconocido' }}
              </p>
            </div>
          </div>

          <!-- Manage account via Clerk (only for non-demo) -->
          <div v-if="!isDemo" class="pt-4 border-t border-[#EEEEF0]">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-[#E5E0D5] text-[#1A1A2E] hover:bg-[#F8F6F1] hover:border-[#A8D4D2] transition-all group"
              @click="openClerkProfile"
            >
              <div class="flex items-center gap-2.5">
                <Settings2 :size="16" class="text-[#9A9690]" />
                <span class="text-sm font-semibold">Gestionar cuenta</span>
              </div>
              <ExternalLink :size="14" class="text-[#9A9690] group-hover:text-[#356E6B] transition-colors" />
            </button>
            <p class="text-[11px] text-[#9A9690] mt-2 px-1">
              Cambiá tu contraseña, correo o cuentas vinculadas desde el panel de Clerk.
            </p>
          </div>

          <div class="pt-4 border-t border-[#EEEEF0]">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-bold rounded-xl transition-all hover:bg-red-50 active:scale-95 border border-red-100"
              data-testid="logout-button"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <!-- Tipo de cambio -->
      <div class="bg-white rounded-2xl shadow-sm border border-[#EEEEF0] overflow-hidden">
        <div class="flex items-center gap-3 px-6 py-5 border-b border-[#F0F2F5]">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style="background: rgba(45, 159, 143, 0.12)"
          >
            <DollarSign :size="18" style="color: #2D9F8F" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#1A1A2E]">Tipo de cambio</h2>
            <p class="text-xs text-[#94A3B8] mt-0.5">Cotización USD → PEN usada en los cálculos</p>
          </div>
        </div>

        <div class="p-6 flex items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl font-black text-[#1C1B18] tabular-nums">S/ {{ fxRate.toFixed(3) }}</span>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="fxFallback ? 'bg-amber-50 text-amber-600' : 'bg-[#EDFAF4] text-[#3D9970]'"
              >
                {{ fxFallback ? 'Estimado' : 'Actualizado' }}
              </span>
            </div>
            <p v-if="updatedAtDisplay" class="text-xs text-[#9A9690] mt-1">Última actualización: {{ updatedAtDisplay }}</p>
          </div>
          <button
            type="button"
            :disabled="fxLoading"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5E0D5] text-[#5A5854] hover:bg-[#F8F6F1] transition-all disabled:opacity-50"
            @click="fxRefresh"
          >
            <span v-if="fxLoading" class="w-3 h-3 rounded-full border border-[#9A9690] border-t-transparent animate-spin inline-block"></span>
            <ExternalLink v-else :size="12" />
            {{ fxLoading ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
