<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import {
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
  Wallet,
  Clock,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const sidebarOpen = ref(true)

const navItems = [
  { name: 'Resumen', fullName: 'Resumen General', to: { name: ROUTE_NAMES.DASHBOARD }, icon: LayoutDashboard },
  { name: 'Insights', fullName: 'Insights', to: { name: ROUTE_NAMES.INSIGHTS }, icon: Lightbulb },
  { name: 'Ingresos', fullName: 'Ingresos', to: { name: ROUTE_NAMES.INGRESOS }, icon: TrendingUp },
  { name: 'Presup.', fullName: 'Presupuesto', to: { name: ROUTE_NAMES.PRESUPUESTO }, icon: Wallet },
  { name: 'Deudas', fullName: 'Deudas', to: { name: ROUTE_NAMES.DEUDAS }, icon: Clock },
  { name: 'Tarjetas', fullName: 'Tarjetas', to: { name: ROUTE_NAMES.TARJETAS }, icon: CreditCard },
  { name: 'Config.', fullName: 'Configuración', to: { name: ROUTE_NAMES.CONFIGURACION }, icon: Settings },
]

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: ROUTE_NAMES.LOGIN })
}
</script>

<template>
  <div class="flex h-screen bg-[#F5F6FA]" data-testid="app-layout">

    <aside
      class="hidden lg:flex flex-col bg-white border-r border-[#EEEEF0] shrink-0 transition-all duration-300"
      :class="sidebarOpen ? 'w-55' : 'w-15'"
      data-testid="sidebar"
    >
      <div
        class="flex items-center h-16 px-3 border-b border-[#EEEEF0]"
        :class="sidebarOpen ? 'justify-between' : 'justify-center'"
      >
        <template v-if="sidebarOpen">
          <div class="flex items-center gap-2.5">
            <svg class="w-7 h-7 shrink-0" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="#B6A77A"/>
              <path d="M10 30 L16 18 L22 24 L28 12 L34 20" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="28" cy="12" r="2" fill="white"/>
            </svg>
            <span class="text-sm font-bold text-[#1A1A2E]" data-testid="app-title">Monei</span>
          </div>
          <button
            class="p-1 rounded-md text-[#94A3B8] hover:text-[#1A1A2E] hover:bg-[#F5F6FA] transition-all"
            data-testid="toggle-sidebar"
            @click="sidebarOpen = false"
          >
            <ChevronRight :size="16" class="rotate-180" />
          </button>
        </template>

        <button
          v-else
          class="w-7 h-7 hover:opacity-80 transition-all"
          data-testid="toggle-sidebar"
          @click="sidebarOpen = true"
        >
          <svg class="w-7 h-7" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="10" fill="#B6A77A"/>
            <path d="M10 30 L16 18 L22 24 L28 12 L34 20" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="28" cy="12" r="2" fill="white"/>
          </svg>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Navegación principal">
        <p
          v-if="sidebarOpen"
          class="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]"
        >
          Menu
        </p>
        <RouterLink
          v-for="item in navItems"
          :key="item.fullName"
          :to="item.to"
          class="sidebar-link flex items-center rounded-lg transition-all"
          :class="sidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2.5'"
          data-testid="nav-link"
        >
          <component :is="item.icon" :size="18" class="shrink-0" />
          <span v-if="sidebarOpen" class="text-sm font-medium truncate">
            {{ item.fullName }}
          </span>
        </RouterLink>
      </nav>

      <div class="border-t border-[#EEEEF0] px-2 py-3">
        <div v-if="sidebarOpen" class="flex items-center gap-1">
          <RouterLink
            :to="{ name: ROUTE_NAMES.CONFIGURACION }"
            class="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2.5 rounded-lg hover:bg-[#F5F6FA] transition-all"
            data-testid="user-profile-link"
          >
            <img
              v-if="auth.currentUser?.avatarUrl"
              :src="auth.currentUser.avatarUrl"
              :alt="auth.currentUser.displayName"
              class="w-7 h-7 rounded-full object-cover shrink-0"
              data-testid="user-avatar"
            />
            <div
              v-else
              class="w-7 h-7 rounded-full bg-[#B6A77A] flex items-center justify-center text-white text-xs font-bold shrink-0"
              aria-hidden="true"
              data-testid="user-initial"
            >
              {{ auth.currentUser?.displayName.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-[#1A1A2E] truncate" data-testid="user-display-name">
                {{ auth.currentUser?.displayName }}
              </p>
              <p class="text-[10px] text-[#94A3B8] truncate" data-testid="user-username">
                @{{ auth.currentUser?.username }}
              </p>
            </div>
          </RouterLink>
          <button
            class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all"
            data-testid="logout-button"
            @click="handleLogout"
          >
            <LogOut :size="16" />
          </button>
        </div>
        <button
          v-else
          class="flex items-center justify-center w-full py-2.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all"
          data-testid="logout-button"
          @click="handleLogout"
        >
          <LogOut :size="18" />
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col overflow-hidden">

      <header class="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-[#EEEEF0] shrink-0">
        <div class="flex items-center gap-2">
          <svg class="w-7 h-7" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="10" fill="#B6A77A"/>
            <path d="M10 30 L16 18 L22 24 L28 12 L34 20" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="28" cy="12" r="2" fill="white"/>
          </svg>
          <span class="text-sm font-bold text-[#1A1A2E]">Monei</span>
        </div>
        <RouterLink
          :to="{ name: ROUTE_NAMES.CONFIGURACION }"
          class="w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F5F6FA] flex items-center justify-center transition-all"
        >
          <Settings :size="18" />
        </RouterLink>
      </header>

      <main class="flex-1 overflow-y-auto pb-20 lg:pb-0" data-testid="main-content">
        <RouterView />
      </main>
    </div>

    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#EEEEF0] flex items-center justify-around h-16 z-50 px-2"
      data-testid="bottom-nav"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.to"
        class="bottom-link flex flex-col items-center justify-center gap-1 flex-1 h-full"
        data-testid="nav-link"
      >
        <component :is="item.icon" :size="20" class="shrink-0" />
        <span class="text-[9px] font-semibold tracking-wide">{{ item.name }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.sidebar-link { color: #64748b; }
.sidebar-link:hover { color: #1a1a2e; background-color: #f5f6fa; }
.sidebar-link.router-link-active {
  color: #8a7050;
  background-color: rgba(182, 167, 122, 0.14);
  font-weight: 600;
}
.sidebar-link.router-link-active svg { color: #b6a77a; }

.bottom-link { color: #94a3b8; }
.bottom-link.router-link-active { color: #b6a77a; }
.bottom-link.router-link-active svg { color: #b6a77a; }
</style>
