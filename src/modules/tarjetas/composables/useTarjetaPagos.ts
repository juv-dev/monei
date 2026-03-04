import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import { pagosApi } from '../services/pagosApi'
import { tarjetasApi } from '../services/api'
import { TARJETAS_QUERY_KEY } from './useTarjetas'
import type { NuevoTarjetaPago } from '../types'

export const PAGOS_QUERY_KEY = (userId: string) => ['finance', userId, 'tarjeta_pagos'] as const

export function useTarjetaPagos() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const userId = computed(() => auth.userId)

  const query = useQuery({
    queryKey: computed(() => PAGOS_QUERY_KEY(userId.value)),
    queryFn: () => pagosApi.getAll(userId.value),
    enabled: computed(() => !!userId.value),
  })

  const addMutation = useMutation({
    mutationFn: async (data: NuevoTarjetaPago) => {
      const pago = await pagosApi.create(userId.value, data)

      const tarjetas = await tarjetasApi.getAll(userId.value)
      const tarjeta = tarjetas.find((t) => t.id === data.tarjetaId)
      if (tarjeta) {
        await tarjetasApi.update(userId.value, data.tarjetaId, {
          montoDeudaActual: Math.max(0, tarjeta.montoDeudaActual - data.monto),
          saldoTotal: tarjeta.saldoTotal != null ? Math.max(0, tarjeta.saldoTotal - data.monto) : undefined,
        })
      }

      return pago
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAGOS_QUERY_KEY(userId.value) })
      void queryClient.invalidateQueries({ queryKey: TARJETAS_QUERY_KEY(userId.value) })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (pagoId: string) => pagosApi.remove(userId.value, pagoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAGOS_QUERY_KEY(userId.value) })
    },
  })

  const pagos = computed(() => query.data.value ?? [])

  function pagosDeTarjeta(tarjetaId: string) {
    return pagos.value.filter((p) => p.tarjetaId === tarjetaId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  return {
    pagos,
    isLoading: computed(() => query.isLoading.value),
    addPago: (data: NuevoTarjetaPago) => addMutation.mutate(data),
    removePago: (pagoId: string) => removeMutation.mutate(pagoId),
    isAddingPago: computed(() => addMutation.isPending.value),
    pagosDeTarjeta,
  }
}
