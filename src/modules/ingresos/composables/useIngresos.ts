import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'
import { ingresosApi } from '../services/api'
import type { NuevoIngreso } from '../types'

export const INGRESOS_BASE_KEY = (userId: string) => ['finance', userId, 'ingresos'] as const
const INGRESOS_QUERY_KEY = (userId: string, year: number, month: number) =>
  [...INGRESOS_BASE_KEY(userId), year, month] as const

export function useIngresos() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const userId = computed(() => auth.userId)
  const { selectedYear, selectedMonth } = useSelectedMonth()

  const query = useQuery({
    queryKey: computed(() => INGRESOS_QUERY_KEY(userId.value, selectedYear.value, selectedMonth.value)),
    queryFn: () =>
      ingresosApi.getAll(userId.value, { year: selectedYear.value, month: selectedMonth.value }),
    enabled: computed(() => !!userId.value),
  })

  const totalIngresos = computed(() => query.data.value?.reduce((sum, item) => sum + item.monto, 0) ?? 0)

  const addMutation = useMutation({
    mutationFn: (data: NuevoIngreso) => ingresosApi.create(userId.value, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INGRESOS_BASE_KEY(userId.value) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NuevoIngreso> }) =>
      ingresosApi.update(userId.value, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INGRESOS_BASE_KEY(userId.value) })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => ingresosApi.remove(userId.value, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INGRESOS_BASE_KEY(userId.value) })
    },
  })

  return {
    ingresos: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    totalIngresos,
    addIngreso: (data: NuevoIngreso) => addMutation.mutate(data),
    updateIngreso: (id: string, data: Partial<NuevoIngreso>) => updateMutation.mutate({ id, data }),
    removeIngreso: (id: string) => removeMutation.mutate(id),
    isAdding: computed(() => addMutation.isPending.value),
    isUpdating: computed(() => updateMutation.isPending.value),
    isRemoving: computed(() => removeMutation.isPending.value),
  }
}
