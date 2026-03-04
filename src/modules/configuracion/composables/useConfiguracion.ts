import { computed } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'

export function useConfiguracion() {
  const auth = useAuthStore()

  const mutation = useMutation({
    mutationFn: async (data: {
      currentPass: string
      newPass: string
      confirmPass: string
    }) => {
      const result = auth.changePassword(data.currentPass, data.newPass, data.confirmPass)
      if (!result.success) {
        throw new Error(result.error!)
      }
      return result
    },
  })

  return {
    changePassword: (data: {
      currentPass: string
      newPass: string
      confirmPass: string
    }) => mutation.mutate(data),
    isChanging: computed(() => mutation.isPending.value),
    isSuccess: computed(() => mutation.isSuccess.value),
    error: computed(() => mutation.error.value?.message ?? null),
    reset: () => mutation.reset(),
  }
}
