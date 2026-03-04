import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Component } from 'vue'

// ─── QueryClient para tests (sin retry, sin caché) ────────────────────────────
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ─── Router mínimo para tests (con nombres para RouterLink) ──────────────────
export function createTestRouter() {
  const stub = { template: '<div/>' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/login', name: 'login', component: stub },
      { path: '/dashboard', name: 'dashboard', component: stub },
      { path: '/insights', name: 'insights', component: stub },
      { path: '/ingresos', name: 'ingresos', component: stub },
      { path: '/presupuesto', name: 'presupuesto', component: stub },
      { path: '/deudas', name: 'deudas', component: stub },
      { path: '/tarjetas', name: 'tarjetas', component: stub },
      { path: '/configuracion', name: 'configuracion', component: stub },
    ],
  })
}

// ─── Helper para ejecutar composables con contexto completo ───────────────────
export function withSetup<T>(composableFn: () => T): {
  result: T
  queryClient: QueryClient
  unmount: () => void
} {
  let result!: T
  const queryClient = createTestQueryClient()
  const pinia = createPinia()
  setActivePinia(pinia)

  const app = createApp({
    setup() {
      result = composableFn()
      return () => null
    },
  })

  app.use(pinia)
  app.use(VueQueryPlugin, { queryClient })

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)

  return {
    result,
    queryClient,
    unmount: () => {
      app.unmount()
      if (document.body.contains(el)) {
        document.body.removeChild(el)
      }
    },
  }
}

// ─── Helper global de montaje con todos los plugins ───────────────────────────
export function createGlobalMountOptions() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const queryClient = createTestQueryClient()
  const router = createTestRouter()

  return {
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }], router],
    },
    pinia,
    queryClient,
    router,
  }
}

// ─── Monta un componente con todos los plugins ────────────────────────────────
import { mount } from '@vue/test-utils'

export function mountWithPlugins(component: Component, options: Record<string, unknown> = {}) {
  const { global, pinia, queryClient, router } = createGlobalMountOptions()
  const wrapper = mount(component, { global, ...options })
  return { wrapper, pinia, queryClient, router }
}
