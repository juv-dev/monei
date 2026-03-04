import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

export const ROUTE_NAMES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  INSIGHTS: 'insights',
  INGRESOS: 'ingresos',
  PRESUPUESTO: 'presupuesto',
  DEUDAS: 'deudas',
  TARJETAS: 'tarjetas',
  CONFIGURACION: 'configuracion',
} as const

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: ROUTE_NAMES.LOGIN,
      component: () => import('~/modules/auth/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('~/shared/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: ROUTE_NAMES.DASHBOARD },
        },
        {
          path: 'dashboard',
          name: ROUTE_NAMES.DASHBOARD,
          component: () => import('~/modules/dashboard/views/DashboardView.vue'),
        },
        {
          path: 'insights',
          name: ROUTE_NAMES.INSIGHTS,
          component: () => import('~/modules/insights/views/InsightsView.vue'),
        },
        {
          path: 'ingresos',
          name: ROUTE_NAMES.INGRESOS,
          component: () => import('~/modules/ingresos/views/IngresosView.vue'),
        },
        {
          path: 'presupuesto',
          name: ROUTE_NAMES.PRESUPUESTO,
          component: () => import('~/modules/presupuesto/views/PresupuestoView.vue'),
        },
        {
          path: 'deudas',
          name: ROUTE_NAMES.DEUDAS,
          component: () => import('~/modules/deudas/views/DeudasView.vue'),
        },
        {
          path: 'tarjetas',
          name: ROUTE_NAMES.TARJETAS,
          component: () => import('~/modules/tarjetas/views/TarjetasView.vue'),
        },
        {
          path: 'configuracion',
          name: ROUTE_NAMES.CONFIGURACION,
          component: () => import('~/modules/configuracion/views/ConfiguracionView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.DASHBOARD },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.isLoading) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => auth.isLoading,
        (loading) => {
          if (!loading) {
            unwatch()
            resolve()
          }
        },
        { immediate: true },
      )
    })
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: ROUTE_NAMES.LOGIN }
  }

  if (to.name === ROUTE_NAMES.LOGIN && auth.isLoggedIn) {
    return { name: ROUTE_NAMES.DASHBOARD }
  }
})

export default router
