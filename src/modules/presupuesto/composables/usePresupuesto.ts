import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import { presupuestoApi } from '../services/api'
import type { NuevoGasto, CategoriaResumen } from '~/shared/types'

export const PRESUPUESTO_QUERY_KEY = (userId: string) => ['finance', userId, 'presupuesto'] as const

export function usePresupuesto() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const userId = computed(() => auth.userId)

  const query = useQuery({
    queryKey: computed(() => PRESUPUESTO_QUERY_KEY(userId.value)),
    queryFn: () => presupuestoApi.getAll(userId.value),
    enabled: computed(() => !!userId.value),
  })

  const gastos = computed(() => query.data.value ?? [])

  const totalGastado = computed(() => gastos.value.reduce((sum, item) => sum + item.monto, 0))

  /** Gastos agrupados por categoría con subtotal */
  const porCategoria = computed<CategoriaResumen[]>(() => {
    const map = new Map<string, CategoriaResumen>()
    for (const gasto of gastos.value) {
      const nombre = gasto.categoria || 'General'
      if (!map.has(nombre)) {
        map.set(nombre, { nombre, items: [], subtotal: 0 })
      }
      const cat = map.get(nombre)!
      cat.items.push(gasto)
      cat.subtotal += gasto.monto
    }
    return Array.from(map.values())
  })

  /** Lista de nombres de categorías únicas ya registradas */
  const categorias = computed<string[]>(() => Array.from(new Set(gastos.value.map((g) => g.categoria || 'General'))))

  const addMutation = useMutation({
    mutationFn: (data: NuevoGasto) => presupuestoApi.create(userId.value, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRESUPUESTO_QUERY_KEY(userId.value),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { monto?: number; descripcion?: string; categoria?: string } }) =>
      presupuestoApi.update(userId.value, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRESUPUESTO_QUERY_KEY(userId.value),
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => presupuestoApi.remove(userId.value, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PRESUPUESTO_QUERY_KEY(userId.value),
      })
    },
  })

  return {
    gastos,
    porCategoria,
    categorias,
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    totalGastado,
    addGasto: (data: NuevoGasto) => addMutation.mutate(data),
    updateGasto: (id: string, data: { monto?: number; descripcion?: string; categoria?: string }) =>
      updateMutation.mutate({ id, data }),
    removeGasto: (id: string) => removeMutation.mutate(id),
    isAdding: computed(() => addMutation.isPending.value),
    isUpdating: computed(() => updateMutation.isPending.value),
    isRemoving: computed(() => removeMutation.isPending.value),
  }
}
