<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  MoreHorizontal,
  User,
  Sparkles,
  BarChart3,
  RefreshCw,
} from 'lucide-vue-next'
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverPortal } from 'reka-ui'
import { useAuthStore } from '~/stores/auth'
import { useExchangeRate } from '~/shared/composables/useExchangeRate'
import { ROUTE_NAMES } from '~/router'
import FloatingChatbot from '~/shared/components/FloatingChatbot.vue'

const { rate: fxRate, isFallback: fxFallback, isLoading: fxLoading, refresh: fxRefresh } = useExchangeRate()

const auth = useAuthStore()
const router = useRouter()

const isHovered = ref(false)
const isPinned = ref(true)
const menuLocked = ref(false)
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

const isExpanded = computed(() => isHovered.value || isPinned.value)

function onMouseEnter() {
  if (hoverTimeout) { clearTimeout(hoverTimeout); hoverTimeout = null }
  isHovered.value = true
}

function onMouseLeave() {
  hoverTimeout = setTimeout(() => {
    if (!menuLocked.value) isHovered.value = false
  }, 100)
}

function togglePin() {
  isPinned.value = !isPinned.value
  if (!isPinned.value) isHovered.value = false
}

function setMenuLocked(locked: boolean) {
  menuLocked.value = locked
  if (!locked && !isPinned.value) isHovered.value = false
}

const navItems = [
  { name: 'Resumen', fullName: 'Resumen General', to: { name: ROUTE_NAMES.DASHBOARD }, icon: LayoutDashboard, mobile: true },
  { name: 'Ingresos', fullName: 'Ingresos', to: { name: ROUTE_NAMES.INGRESOS }, icon: TrendingUp, mobile: true },
  { name: 'Egresos', fullName: 'Egresos', to: { name: ROUTE_NAMES.PRESUPUESTO }, icon: Wallet, mobile: true },
  { name: 'Créditos', fullName: 'Créditos', to: { name: ROUTE_NAMES.CREDITOS }, icon: CreditCard, mobile: true },
  { name: 'Reportes', fullName: 'Reportes', to: { name: ROUTE_NAMES.REPORTES }, icon: BarChart3, mobile: false },
  { name: 'Insights', fullName: 'Insights IA', to: { name: ROUTE_NAMES.INSIGHTS }, icon: Sparkles, mobile: true },
]

const mobileNavItems = navItems.filter((i) => i.mobile)

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: ROUTE_NAMES.LOGIN })
}
</script>

<template>
  <div class="flex h-screen bg-[#F8F6F1]" data-testid="app-layout">

    <!-- Sidebar -->
    <aside
      class="hidden lg:flex flex-col bg-[#FDFAF5] border-r border-[#E5E0D5] shrink-0 transition-[width] duration-[250ms] ease-in-out overflow-hidden"
      :class="isExpanded ? 'w-60' : 'w-[4.5rem]'"
      data-testid="sidebar"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Logo / Brand -->
      <div class="flex items-center h-16 px-4 border-b border-[#E5E0D5] shrink-0 gap-2.5">
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style="background: linear-gradient(135deg, #C8AA72 0%, #8A6840 100%);"
        >
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden="true">
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
        <span
          v-if="isExpanded"
          class="text-lg font-bold text-[#1A1A2E] tracking-tight whitespace-nowrap"
          data-testid="app-title"
        >monei</span>
      </div>

      <!-- Nav -->
      <nav class="sidebar-no-scrollbar flex flex-col w-full overflow-y-auto overflow-x-hidden flex-1 min-h-0 py-3 px-2 gap-0.5" aria-label="Navegación principal">
        <RouterLink
          v-for="item in navItems"
          :key="item.fullName"
          :to="item.to"
          class="nav-item group relative w-full flex items-center cursor-pointer rounded-xl transition-all duration-150"
          :class="isExpanded ? 'px-2.5 py-2.5 gap-3' : 'justify-center py-2.5'"
          data-testid="nav-link"
        >
          <span class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-150 nav-icon-wrap">
            <component :is="item.icon" :size="18" class="shrink-0" />
          </span>
          <span
            v-if="isExpanded"
            class="flex-1 min-w-0 text-sm font-medium truncate whitespace-nowrap transition-colors duration-150"
          >
            {{ item.fullName }}
          </span>
        </RouterLink>
      </nav>

      <!-- FX Rate chip -->
      <div class="w-full shrink-0 px-2 pb-1.5">
        <button
          type="button"
          class="w-full flex items-center rounded-xl px-2 py-1.5 transition-colors hover:bg-[#F0EDE8] group"
          :class="isExpanded ? 'gap-2.5' : 'justify-center'"
          :title="fxFallback ? 'Tipo de cambio estimado' : 'Tipo de cambio actualizado'"
          @click="fxRefresh"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0 transition-colors"
            :class="fxFallback ? 'bg-amber-400' : 'bg-[#3D9970]'"
          ></span>
          <span v-if="isExpanded" class="flex-1 flex items-center justify-between min-w-0">
            <span class="text-[10px] font-semibold text-[#9A9690] truncate">USD/PEN</span>
            <span class="text-[10px] font-bold text-[#5A5854] tabular-nums flex items-center gap-1">
              S/ {{ fxRate.toFixed(3) }}
              <RefreshCw v-if="!fxLoading" :size="9" class="text-[#C5C1BB] group-hover:text-[#9A9690] transition-colors" />
              <span v-else class="w-2 h-2 rounded-full border border-[#9A9690] border-t-transparent animate-spin inline-block"></span>
            </span>
          </span>
          <span v-else class="text-[9px] font-bold text-[#9A9690] tabular-nums">{{ fxRate.toFixed(2) }}</span>
        </button>
      </div>

      <!-- User section -->
      <div class="w-full shrink-0 border-t border-[#E5E0D5] p-2">
        <div v-if="isExpanded" class="flex items-center gap-1">
          <div class="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-2">
            <img
              v-if="auth.currentUser?.avatarUrl"
              :src="auth.currentUser.avatarUrl"
              :alt="auth.currentUser.displayName"
              class="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
              data-testid="user-avatar"
            />
            <div
              v-else
              class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
              style="background: linear-gradient(135deg, #4D9B97 0%, #356E6B 100%);"
              data-testid="user-initial"
            >
              {{ auth.currentUser?.displayName.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-900 truncate" data-testid="user-display-name">
                {{ auth.currentUser?.displayName }}
              </p>
              <p class="text-[10px] text-slate-500 truncate" data-testid="user-username">
                {{ auth.currentUser?.username }}
              </p>
            </div>
          </div>

          <PopoverRoot @update:open="setMenuLocked">
            <PopoverTrigger class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all" data-testid="user-menu-trigger">
              <MoreHorizontal :size="16" />
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent side="top" align="end" :side-offset="6" class="z-50 w-48 rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 py-1.5 outline-none">
                <RouterLink :to="{ name: ROUTE_NAMES.CONFIGURACION }" class="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                  <User :size="14" class="text-slate-400" />
                  Mi perfil
                </RouterLink>
                <div class="h-px bg-slate-100 my-1"></div>
                <button class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-all" data-testid="logout-button" @click="handleLogout">
                  <LogOut :size="14" />
                  Cerrar sesión
                </button>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
        </div>

        <!-- Collapsed -->
        <PopoverRoot v-else @update:open="setMenuLocked">
          <PopoverTrigger class="flex items-center justify-center w-full py-2 rounded-xl hover:bg-slate-50 transition-all">
            <img v-if="auth.currentUser?.avatarUrl" :src="auth.currentUser.avatarUrl" :alt="auth.currentUser.displayName" class="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
            <div
              v-else
              class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style="background: linear-gradient(135deg, #4D9B97 0%, #356E6B 100%);"
            >
              {{ auth.currentUser?.displayName.charAt(0).toUpperCase() }}
            </div>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side="right" align="end" :side-offset="6" class="z-50 w-48 rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 py-1.5 outline-none">
              <RouterLink :to="{ name: ROUTE_NAMES.CONFIGURACION }" class="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all">
                <User :size="14" class="text-slate-400" />
                Mi perfil
              </RouterLink>
              <div class="h-px bg-slate-100 my-1"></div>
              <button class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-all" @click="handleLogout">
                <LogOut :size="14" />
                Cerrar sesión
              </button>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
    </aside>

    <!-- Toggle pin button -->
    <button
      class="hidden lg:flex fixed top-[4.5rem] z-20 items-center justify-center w-6 h-6 rounded-full bg-white border border-[#E5E0D5] shadow-md text-[#4D9B97] hover:bg-[#EBF5F5] hover:border-[#A8D4D2] transition-all duration-[250ms]"
      :style="{ left: isExpanded ? 'calc(15rem - 0.75rem)' : 'calc(4.5rem - 0.75rem)' }"
      data-testid="toggle-sidebar"
      @click="togglePin"
    >
      <svg v-if="!isPinned" width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M2 3L6 7L2 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7.5 3L11.5 7L7.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M12 3L8 7L12 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 3L2.5 7L6.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Mobile header -->
      <header class="lg:hidden flex items-center justify-between px-4 h-14 bg-[#FDFAF5] border-b border-[#E5E0D5] shrink-0">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style="background: linear-gradient(135deg, #4D9B97 0%, #356E6B 100%);"
          >
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M10 30 L16 18 L22 24 L28 12 L34 20" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="28" cy="12" r="2.5" fill="white" />
            </svg>
          </div>
          <span class="text-base font-bold text-slate-900 tracking-tight">Monei</span>
        </div>
        <RouterLink :to="{ name: ROUTE_NAMES.CONFIGURACION }" class="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all">
          <Settings :size="18" />
        </RouterLink>
      </header>

      <main id="main-content" class="flex-1 overflow-y-auto pb-20 lg:pb-0" data-testid="main-content" aria-live="polite">
        <RouterView />
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E5E0D5] flex items-center justify-around h-16 z-50 px-2"
      data-testid="bottom-nav"
    >
      <RouterLink
        v-for="item in mobileNavItems"
        :key="item.name"
        :to="item.to"
        class="bottom-link flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-colors"
        data-testid="nav-link"
      >
        <component :is="item.icon" :size="19" class="shrink-0 transition-transform" />
        <span class="text-[9px] font-semibold tracking-wide">{{ item.name }}</span>
      </RouterLink>
    </nav>

    <FloatingChatbot />
  </div>
</template>

<style scoped>
.sidebar-no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.sidebar-no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Nav item — default */
.nav-item {
  color: #9A9690;
}
.nav-item .nav-icon-wrap {
  color: #B8B4AE;
}
.nav-item:hover {
  background-color: #F0EDE5;
  color: #1C1B18;
}
.nav-item:hover .nav-icon-wrap {
  color: #4D9B97;
}

/* Active state — sage tint */
.nav-item.router-link-active {
  background: linear-gradient(135deg, rgba(77, 155, 151, 0.12) 0%, rgba(53, 110, 107, 0.08) 100%);
  color: #356E6B;
  font-weight: 600;
}
.nav-item.router-link-active .nav-icon-wrap {
  background-color: #fff;
  color: #4D9B97;
  box-shadow: 0 1px 2px rgba(77, 155, 151, 0.12), 0 0 0 1px rgba(77, 155, 151, 0.10);
}

/* Mobile bottom nav */
.bottom-link {
  color: #9A9690;
}
.bottom-link.router-link-active {
  color: #4D9B97;
}
.bottom-link.router-link-active svg {
  color: #4D9B97;
  transform: translateY(-1px);
}
</style>
