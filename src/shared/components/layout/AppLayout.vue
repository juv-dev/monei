<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Home, DollarSign, ShoppingBag, Clock, CreditCard, User } from 'lucide-vue-next'
import { ROUTE_NAMES } from '~/router'

const mobileBottomNav = [
  { name: 'Inicio', to: { name: ROUTE_NAMES.DASHBOARD }, icon: Home },
  { name: 'Ingresos', to: { name: ROUTE_NAMES.INGRESOS }, icon: DollarSign },
  { name: 'Egresos', to: { name: ROUTE_NAMES.PRESUPUESTO }, icon: ShoppingBag },
  { name: 'Créditos', to: { name: ROUTE_NAMES.CREDITOS }, icon: Clock },
  { name: 'Tarjetas', to: { name: ROUTE_NAMES.TARJETAS }, icon: CreditCard },
  { name: 'Perfil', to: { name: ROUTE_NAMES.CONFIGURACION }, icon: User },
]
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-[#F8F6F1]" data-testid="app-layout">
    <div
      class="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#F8F6F1]"
    >
      <main
        id="main-content"
        class="flex-1 overflow-y-auto pb-28"
        data-testid="main-content"
        aria-live="polite"
      >
        <RouterView />
      </main>

      <nav
        class="absolute inset-x-0 bottom-0 z-50 px-4 pt-2 pb-[22px]"
        style="background: linear-gradient(180deg, rgba(241, 236, 225, 0) 0%, rgba(241, 236, 225, 0.92) 32%, #f1ece1 60%)"
        data-testid="bottom-nav"
      >
        <div
          class="flex items-center justify-between rounded-[22px] border bg-white px-2 py-2.5"
          style="border-color: #e7e0d2; box-shadow: 0 8px 24px -8px rgba(28, 26, 21, 0.22)"
        >
          <RouterLink
            v-for="item in mobileBottomNav"
            :key="item.name"
            :to="item.to"
            class="bottom-link flex flex-1 flex-col items-center gap-[3px] px-0.5 py-0.5"
            data-testid="nav-link"
          >
            <component :is="item.icon" :size="21" class="shrink-0" />
            <span class="text-[9px] font-bold tracking-wide">{{ item.name }}</span>
          </RouterLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.bottom-link {
  color: #a39a88;
}
.bottom-link.router-link-active {
  color: #16332f;
  font-weight: 700;
}
.bottom-link.router-link-active svg {
  color: #16332f;
  transform: translateY(-1px);
}
</style>
