import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

export const ROUTE_NAMES = {
  LOGIN: 'login',
  SSO_CALLBACK: 'sso-callback',
  DASHBOARD: 'dashboard',
  INSIGHTS: 'insights',
  INGRESOS: 'ingresos',
  PRESUPUESTO: 'presupuesto',
  CREDITOS: 'creditos',
  DEUDAS: 'deudas',
  TARJETAS: 'tarjetas',
  REPORTES: 'reportes',
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
      path: '/sso-callback',
      name: ROUTE_NAMES.SSO_CALLBACK,
      component: () => import('~/modules/auth/views/SsoCallbackView.vue'),
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
          path: 'egresos',
          name: ROUTE_NAMES.PRESUPUESTO,
          component: () => import('~/modules/presupuesto/views/PresupuestoView.vue'),
        },
        {
          path: 'presupuesto',
          redirect: { name: ROUTE_NAMES.PRESUPUESTO },
        },
        {
          path: 'creditos',
          name: ROUTE_NAMES.CREDITOS,
          component: () => import('~/modules/creditos/views/CreditosView.vue'),
        },
        {
          path: 'deudas',
          name: ROUTE_NAMES.DEUDAS,
          redirect: { name: ROUTE_NAMES.CREDITOS, query: { tab: 'prestamos' } },
        },
        {
          path: 'tarjetas',
          name: ROUTE_NAMES.TARJETAS,
          redirect: { name: ROUTE_NAMES.CREDITOS, query: { tab: 'tarjetas' } },
        },
        {
          path: 'reportes',
          name: ROUTE_NAMES.REPORTES,
          component: () => import('~/modules/reportes/views/ReportesView.vue'),
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

const CLERK_QUERY_KEYS = ['__clerk_handshake', '__clerk_status', '__clerk_db_jwt', '__clerk_ticket']

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

  const hasClerkParam = CLERK_QUERY_KEYS.some((k) => k in to.query)
  if (hasClerkParam) {
    const cleanQuery = { ...to.query }
    for (const k of CLERK_QUERY_KEYS) delete cleanQuery[k]
    return { path: to.path, query: cleanQuery, hash: to.hash, replace: true }
  }
})

export default router
