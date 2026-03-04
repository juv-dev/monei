import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import { tarjetasApi } from '../services/api'
import type { NuevaTarjeta } from '../types'

type UpdatePayload = { id: string; data: Partial<NuevaTarjeta> }

export const TARJETAS_QUERY_KEY = (userId: string) => ['finance', userId, 'tarjetas'] as const

export function useTarjetas() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const userId = computed(() => auth.userId)

  const query = useQuery({
    queryKey: computed(() => TARJETAS_QUERY_KEY(userId.value)),
    queryFn: () => tarjetasApi.getAll(userId.value),
    enabled: computed(() => !!userId.value),
  })

  const totalTarjetas = computed(() => query.data.value?.reduce((sum, item) => sum + item.montoDeudaActual, 0) ?? 0)

  const lineaTotalCombinada = computed(() => query.data.value?.reduce((sum, item) => sum + item.lineaTotal, 0) ?? 0)

  const addMutation = useMutation({
    mutationFn: (data: NuevaTarjeta) => tarjetasApi.create(userId.value, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: TARJETAS_QUERY_KEY(userId.value),
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => tarjetasApi.remove(userId.value, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: TARJETAS_QUERY_KEY(userId.value),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: UpdatePayload) => tarjetasApi.update(userId.value, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: TARJETAS_QUERY_KEY(userId.value),
      })
    },
  })

  return {
    tarjetas: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    totalTarjetas,
    lineaTotalCombinada,
    addTarjeta: (data: NuevaTarjeta) => addMutation.mutate(data),
    removeTarjeta: (id: string) => removeMutation.mutate(id),
    updateTarjeta: (id: string, data: Partial<NuevaTarjeta>) => updateMutation.mutate({ id, data }),
    isAdding: computed(() => addMutation.isPending.value),
    isRemoving: computed(() => removeMutation.isPending.value),
    isUpdating: computed(() => updateMutation.isPending.value),
  }
}
