import { QueryClient, QueryCache, MutationCache } from '@tanstack/vue-query'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'

const CONNECTION_ERROR_MSG = 'Error de conexión. Volvé a intentarlo nuevamente.'

function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) return true
  if (error instanceof Error && 'status' in error) {
    const status = (error as { status: number }).status
    return status === 0 || status === 521 || status === 522 || status === 524
  }
  return false
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isConnectionError(error)) {
        const { showToast } = useAppFeedback()
        showToast(CONNECTION_ERROR_MSG, 'error')
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const { showToast } = useAppFeedback()
      showToast(isConnectionError(error) ? CONNECTION_ERROR_MSG : 'Ocurrió un error. Volvé a intentarlo.', 'error')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 min — financial data doesn't change every second
      gcTime: 1000 * 60 * 30,       // 30 min — keep cache in memory longer to reduce refetches
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
