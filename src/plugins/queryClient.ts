import { QueryClient, QueryCache, MutationCache } from '@tanstack/vue-query'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { useAppFeedback } from '~/shared/composables/useAppFeedback'
import { dexieStorage } from '~/shared/services/dexieStorage'

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
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: dexieStorage,
  key: 'monei-query-cache',
  throttleTime: 1000,
})

void persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey
      return Array.isArray(key) && key[0] === 'finance' && query.state.status === 'success'
    },
  },
})
