import { QueryClient } from '@tanstack/react-query';
import { QUERY_CONFIG } from '@/constants';

/** Shared React Query client with sensible defaults for this app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.staleTime,
      gcTime: QUERY_CONFIG.gcTime,
      refetchOnWindowFocus: false,
      retry: (failureCount) => failureCount < QUERY_CONFIG.retry,
    },
    mutations: {
      retry: false,
    },
  },
});
