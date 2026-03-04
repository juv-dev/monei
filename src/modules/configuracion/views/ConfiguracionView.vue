<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogOut, Shield, Mail, User as UserIcon } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()

const providerLabel: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  demo: 'Demo',
}

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: ROUTE_NAMES.LOGIN })
}
</script>

<template>
  <div class="min-h-screen bg-[#F0F2F5]" data-testid="configuracion-view">
    <div class="max-w-2xl mx-auto p-5 lg:p-8 space-y-5">

      <div>
        <h1 class="text-2xl lg:text-3xl font-bold text-[#1A1A2E]">Configuración</h1>
        <p class="text-sm text-[#64748B] mt-0.5">Gestiona tu cuenta y preferencias</p>
      </div>

      <div
        class="rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-lg"
        style="background: linear-gradient(135deg, #B6A77A 0%, #8A7050 100%)"
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

          <div>
            <p class="text-white text-xl font-black" data-testid="user-display-name">{{ auth.currentUser?.displayName }}</p>
            <p class="text-white/60 text-sm mt-0.5" data-testid="user-email">{{ auth.currentUser?.username }}</p>
            <span class="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold bg-white/20 text-white rounded-full px-3 py-1">
              <span class="w-1.5 h-1.5 rounded-full bg-white/80 inline-block"></span>
              Sesión activa
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-[#EEEEF0] overflow-hidden">
        <div class="flex items-center gap-3 px-6 py-5 border-b border-[#F0F2F5]">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background: rgba(182,167,122,0.15)">
            <Shield :size="18" style="color: #8A7050" aria-hidden="true" />
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
              <p class="text-sm text-[#1A1A2E] font-medium" data-testid="info-name">{{ auth.currentUser?.displayName }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Mail :size="16" class="text-[#94A3B8] shrink-0" aria-hidden="true" />
            <div>
              <p class="text-xs text-[#94A3B8] uppercase tracking-wide font-semibold">Correo</p>
              <p class="text-sm text-[#1A1A2E] font-medium" data-testid="info-email">{{ auth.currentUser?.username }}</p>
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

    </div>
  </div>
</template>
