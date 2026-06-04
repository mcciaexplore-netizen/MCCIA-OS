import { QueryClient } from '@tanstack/react-query';
import { NotConfiguredError } from '@/api/errors';
import { QUERY_CONFIG } from '@/constants';

/** Shared React Query client with sensible defaults for this app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.staleTime,
      gcTime: QUERY_CONFIG.gcTime,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry when the backend simply isn't configured.
        if (error instanceof NotConfiguredError) return false;
        return failureCount < QUERY_CONFIG.retry;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
