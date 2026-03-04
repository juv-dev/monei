import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import { deudasApi } from '../services/api'
import type { NuevaDeuda } from '../types'

export const DEUDAS_QUERY_KEY = (userId: string) =>
  ['finance', userId, 'deudas'] as const

export function useDeudas() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const userId = computed(() => auth.userId)

  const query = useQuery({
    queryKey: computed(() => DEUDAS_QUERY_KEY(userId.value)),
    queryFn: () => deudasApi.getAll(userId.value),
    enabled: computed(() => !!userId.value),
  })

  const totalDeudas = computed(
    () => query.data.value?.reduce((sum, item) => sum + item.totalDeuda, 0) ?? 0,
  )

  const totalPendiente = computed(
    () =>
      query.data.value?.reduce((sum, item) => sum + item.montoActualPendiente, 0) ?? 0,
  )

  const addMutation = useMutation({
    mutationFn: (data: NuevaDeuda) => deudasApi.create(userId.value, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DEUDAS_QUERY_KEY(userId.value),
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deudasApi.remove(userId.value, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DEUDAS_QUERY_KEY(userId.value),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NuevaDeuda> }) =>
      deudasApi.update(userId.value, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DEUDAS_QUERY_KEY(userId.value),
      })
    },
  })

  return {
    deudas: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    totalDeudas,
    totalPendiente,
    addDeuda: (data: NuevaDeuda) => addMutation.mutate(data),
    removeDeuda: (id: string) => removeMutation.mutate(id),
    updateDeuda: (id: string, data: Partial<NuevaDeuda>) => updateMutation.mutate({ id, data }),
    isAdding: computed(() => addMutation.isPending.value),
    isRemoving: computed(() => removeMutation.isPending.value),
    isUpdating: computed(() => updateMutation.isPending.value),
  }
}
