<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Shield, DollarSign, Bell, RefreshCw, LogOut, ChevronRight, List, PawPrint, Settings2, ExternalLink } from 'lucide-vue-next'
import { useClerk } from '@clerk/vue'
import { useAuthStore } from '~/stores/auth'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import { usePushNotifications } from '~/shared/composables/usePushNotifications'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const clerk = useClerk()
const { rate: fxRate, isFallback: fxFallback, updatedAtDisplay, refresh: fxRefresh, isLoading: fxLoading } = useExchangeRate()
const push = usePushNotifications()

const hasPet = ref(false)

const providerLabel: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  demo: 'Demo',
  email: 'Email',
}

const isDemo = computed(() => auth.currentUser?.provider === 'demo')

const userInitial = computed(() => auth.currentUser?.displayName.charAt(0).toUpperCase() ?? '')

const sessionBadge = computed(() => {
  const provider = auth.currentUser?.provider ?? ''
  const label = providerLabel[provider] ?? ''
  return label ? `Sesión activa · ${label}` : 'Sesión activa'
})

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: ROUTE_NAMES.LOGIN })
}

function openClerkProfile(): void {
  clerk.value?.openUserProfile()
}

async function togglePush(): Promise<void> {
  if (push.isEnabled.value) {
    await push.disable()
  } else {
    await push.enable()
  }
}
</script>

<template>
  <div
    data-testid="configuracion-view"
    style="background:#F1ECE1; font-family:'Manrope',system-ui,sans-serif; color:#1C1A15; min-height:100vh"
  >
    <div class="mx-auto w-full max-w-[460px] px-[18px] pt-6 pb-28">

      <p style="margin:0 0 16px; font-size:25px; font-weight:800; letter-spacing:-.025em; color:#1C1A15">Perfil</p>

      <div
        class="relative overflow-hidden"
        style="border-radius:22px; padding:20px; margin-bottom:14px; background:linear-gradient(140deg,#C8AA72 0%,#8A6840 100%); box-shadow:0 14px 30px -12px rgba(138,104,64,.5)"
      >
        <div
          class="absolute pointer-events-none"
          style="top:-40px; right:-30px; width:150px; height:150px; border-radius:50%; background:rgba(255,255,255,.1)"
        ></div>

        <div class="relative flex items-center" style="gap:15px">
          <img
            v-if="auth.currentUser?.avatarUrl"
            :src="auth.currentUser.avatarUrl"
            :alt="auth.currentUser.displayName"
            data-testid="user-avatar"
            style="width:62px; height:62px; border-radius:18px; object-fit:cover; flex-shrink:0"
          />
          <div
            v-else
            data-testid="user-initial"
            class="flex items-center justify-center"
            style="width:62px; height:62px; border-radius:18px; background:rgba(255,255,255,.22); flex-shrink:0; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:26px; color:#fff"
          >
            {{ userInitial }}
          </div>

          <div style="flex:1; min-width:0">
            <p
              data-testid="user-display-name"
              style="margin:0; font-size:19px; font-weight:800; color:#fff; letter-spacing:-.01em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
            >
              {{ auth.currentUser?.displayName }}
            </p>
            <p
              data-testid="user-email"
              style="margin:3px 0 0; font-size:12px; color:rgba(255,255,255,.78); overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
            >
              {{ auth.currentUser?.username }}
            </p>
            <span
              class="inline-flex items-center"
              style="gap:5px; margin-top:9px; font-size:11px; font-weight:700; background:rgba(255,255,255,.22); color:#fff; border-radius:999px; padding:4px 10px"
            >
              <span style="width:6px; height:6px; border-radius:50%; background:#fff; display:inline-block; flex-shrink:0"></span>
              {{ sessionBadge }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="overflow-hidden"
        style="background:#fff; border:1px solid #E7E0D2; border-radius:20px; margin-bottom:14px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
      >
        <div class="flex items-center" style="gap:11px; padding:14px 16px; border-bottom:1px solid #F0EBE0">
          <div
            class="flex items-center justify-center shrink-0"
            style="width:36px; height:36px; border-radius:11px; background:#F4EEDF"
          >
            <Shield :size="17" style="color:#B8893A" aria-hidden="true" />
          </div>
          <div>
            <p style="margin:0; font-size:13px; font-weight:800">Información de la cuenta</p>
            <p style="margin:2px 0 0; font-size:11px; color:#9A9384">Detalles de tu sesión</p>
          </div>
        </div>

        <div style="padding:6px 16px">
          <div class="flex items-center justify-between" style="padding:11px 0; border-bottom:1px solid #F6F2EA">
            <span style="font-size:12px; color:#9A9384; font-weight:600">Nombre</span>
            <span data-testid="info-name" style="font-size:13px; font-weight:700">
              {{ auth.currentUser?.displayName }}
            </span>
          </div>

          <div class="flex items-center justify-between" style="padding:11px 0; border-bottom:1px solid #F6F2EA">
            <span style="font-size:12px; color:#9A9384; font-weight:600">Usuario</span>
            <span
              data-testid="info-email"
              style="font-size:13px; font-weight:700; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"
            >
              {{ auth.currentUser?.username }}
            </span>
          </div>

          <div
            class="flex items-center justify-between"
            :style="isDemo ? 'padding:11px 0' : 'padding:11px 0; border-bottom:1px solid #F6F2EA'"
          >
            <span style="font-size:12px; color:#9A9384; font-weight:600">Proveedor</span>
            <span
              data-testid="info-provider"
              style="font-size:11px; font-weight:700; background:#F4EEDF; color:#B8893A; border-radius:999px; padding:3px 10px"
            >
              {{ providerLabel[auth.currentUser?.provider ?? ''] ?? 'Desconocido' }}
            </span>
          </div>

          <div v-if="!isDemo" style="padding:11px 0">
            <button
              type="button"
              class="w-full flex items-center justify-between"
              style="gap:8px; background:#F8F6F1; border:1px solid #E7E0D2; border-radius:13px; padding:11px 14px; cursor:pointer; font-family:inherit"
              @click="openClerkProfile"
            >
              <div class="flex items-center" style="gap:8px">
                <Settings2 :size="15" style="color:#9A9384" aria-hidden="true" />
                <span style="font-size:13px; font-weight:700; color:#1C1A15">Gestionar cuenta</span>
              </div>
              <ExternalLink :size="13" style="color:#9A9384" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        style="background:#fff; border:1px solid #E7E0D2; border-radius:20px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
      >
        <div class="flex items-center" style="gap:11px; margin-bottom:14px">
          <div
            class="flex items-center justify-center shrink-0"
            style="width:36px; height:36px; border-radius:11px; background:#EAF6F0"
          >
            <DollarSign :size="17" style="color:#1E9E6A" aria-hidden="true" />
          </div>
          <div>
            <p style="margin:0; font-size:13px; font-weight:800">Tipo de cambio</p>
            <p style="margin:2px 0 0; font-size:11px; color:#9A9384">USD → PEN usado en cálculos</p>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center" style="gap:9px">
            <span style="font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:600; letter-spacing:-.02em">
              S/ {{ fxRate.toFixed(3) }}
            </span>
            <span
              style="font-size:10px; font-weight:700; border-radius:999px; padding:3px 8px"
              :style="fxFallback ? 'background:#FFF8EC; color:#D08A3A' : 'background:#EAF6F0; color:#1E9E6A'"
            >
              {{ fxFallback ? 'Estimado' : 'Actualizado' }}
            </span>
          </div>
          <button
            type="button"
            :disabled="fxLoading"
            class="flex items-center shrink-0 disabled:opacity-50"
            style="gap:6px; border:1px solid #E7E0D2; background:#fff; border-radius:11px; padding:8px 12px; font-family:inherit; font-size:11px; font-weight:700; color:#5A5448; cursor:pointer"
            @click="fxRefresh"
          >
            <span
              v-if="fxLoading"
              class="animate-spin"
              style="width:12px; height:12px; border-radius:50%; border:1.5px solid #9A9384; border-top-color:transparent; display:inline-block; flex-shrink:0"
            ></span>
            <RefreshCw v-else :size="13" aria-hidden="true" />
            Actualizar
          </button>
        </div>

        <p v-if="updatedAtDisplay" style="font-size:11px; color:#9A9384; margin:8px 0 0">
          Última actualización: {{ updatedAtDisplay }}
        </p>
      </div>

      <div
        style="background:#fff; border:1px solid #E7E0D2; border-radius:20px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center" style="gap:11px">
            <div
              class="flex items-center justify-center shrink-0"
              style="width:36px; height:36px; border-radius:11px; background:#F4EEDF"
            >
              <Bell :size="17" style="color:#B8893A" aria-hidden="true" />
            </div>
            <div>
              <p style="margin:0; font-size:13px; font-weight:800">Notificaciones</p>
              <p style="margin:2px 0 0; font-size:11px; color:#9A9384">
                {{ push.isEnabled.value ? 'Notificaciones activadas' : 'Recordatorios y alertas' }}
              </p>
            </div>
          </div>

          <div
            v-if="!push.isSupported.value"
            data-testid="push-not-supported"
            style="font-size:11px; color:#9A9384"
          >
            No soportado
          </div>
          <div
            v-else-if="!push.isConfigured.value"
            data-testid="push-not-configured"
            style="font-size:11px; color:#9A9384"
          >
            Sin configurar
          </div>
          <button
            v-else
            type="button"
            data-testid="push-toggle-button"
            :disabled="push.isWorking.value || push.permission.value === 'denied'"
            class="relative shrink-0 disabled:opacity-50"
            :style="push.isEnabled.value
              ? 'width:44px; height:26px; border-radius:999px; background:linear-gradient(135deg,#3FB98C,#1E9E6A); border:none; cursor:pointer; padding:0'
              : 'width:44px; height:26px; border-radius:999px; background:#D8D1C2; border:none; cursor:pointer; padding:0'"
            :aria-label="push.isEnabled.value ? 'Desactivar notificaciones' : 'Activar notificaciones'"
            :aria-pressed="push.isEnabled.value"
            @click="togglePush"
          >
            <span
              class="absolute transition-all"
              :style="push.isEnabled.value
                ? 'width:20px; height:20px; border-radius:50%; background:#fff; top:3px; left:21px; box-shadow:0 1px 3px rgba(0,0,0,.2)'
                : 'width:20px; height:20px; border-radius:50%; background:#fff; top:3px; left:3px; box-shadow:0 1px 3px rgba(0,0,0,.2)'"
            ></span>
          </button>
        </div>
      </div>

      <div
        style="background:#fff; border:1px solid #E7E0D2; border-radius:20px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center" style="gap:11px">
            <div
              class="flex items-center justify-center shrink-0"
              style="width:36px; height:36px; border-radius:11px; background:#F4EEDF"
            >
              <PawPrint :size="18" style="color:#B8893A" aria-hidden="true" />
            </div>
            <div>
              <p style="margin:0; font-size:13px; font-weight:800">¿Tenés una mascota?</p>
              <p style="margin:2px 0 0; font-size:11px; color:#9A9384">Activá el plan de alimentación</p>
            </div>
          </div>

          <button
            type="button"
            class="relative shrink-0"
            :style="hasPet
              ? 'width:44px; height:26px; border-radius:999px; background:linear-gradient(135deg,#D08A4A,#B8893A); border:none; cursor:pointer; padding:0'
              : 'width:44px; height:26px; border-radius:999px; background:#D8D1C2; border:none; cursor:pointer; padding:0'"
            :aria-label="hasPet ? 'Desactivar plan mascota' : 'Activar plan mascota'"
            :aria-pressed="hasPet"
            @click="hasPet = !hasPet"
          >
            <span
              class="absolute transition-all"
              :style="hasPet
                ? 'width:20px; height:20px; border-radius:50%; background:#fff; top:3px; left:21px; box-shadow:0 1px 3px rgba(0,0,0,.2)'
                : 'width:20px; height:20px; border-radius:50%; background:#fff; top:3px; left:3px; box-shadow:0 1px 3px rgba(0,0,0,.2)'"
            ></span>
          </button>
        </div>

        <button
          v-if="hasPet"
          type="button"
          class="flex items-center w-full"
          style="gap:11px; margin-top:14px; border:none; cursor:pointer; background:#FBF6EC; border-radius:14px; padding:13px 14px; font-family:inherit; text-align:left"
          aria-label="Abrir plan alimenticio"
          @click="router.push({ name: ROUTE_NAMES.MASCOTA })"
        >
          <div
            class="flex items-center justify-center shrink-0"
            style="width:34px; height:34px; border-radius:10px; background:linear-gradient(140deg,#C8AA72,#8A6840)"
          >
            <List :size="17" style="color:#fff" aria-hidden="true" />
          </div>
          <div style="flex:1; min-width:0">
            <p style="margin:0; font-size:13px; font-weight:800; color:#7A5A28">Plan alimenticio</p>
            <p style="margin:2px 0 0; font-size:11px; color:#B89A5E; font-weight:600">Sin configurar</p>
          </div>
          <ChevronRight :size="18" style="color:#C8AA72; flex-shrink:0" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        class="w-full flex items-center justify-center"
        style="gap:8px; border:none; cursor:pointer; background:linear-gradient(135deg,#26241C,#141309); color:#F1ECE1; border-radius:16px; padding:14px; font-family:inherit; font-size:13px; font-weight:700; margin-bottom:11px; box-shadow:0 8px 18px -6px rgba(20,19,13,.5)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E8C97E"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exportar a Excel
      </button>

      <button
        type="button"
        data-testid="logout-button"
        class="w-full flex items-center justify-center"
        style="gap:8px; border:1px solid #F0D5D1; cursor:pointer; background:#fff; color:#C25A4E; border-radius:16px; padding:14px; font-family:inherit; font-size:13px; font-weight:700"
        @click="handleLogout"
      >
        <LogOut :size="16" style="color:#C25A4E" aria-hidden="true" />
        Cerrar sesión
      </button>

      <p style="text-align:center; margin:18px 0 0; font-size:11px; color:#B8B1A2; font-weight:600">monei · v2.0</p>

    </div>
  </div>
</template>
