import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from './ui/ErrorState';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Rendered while loading (a skeleton). */
  loading: ReactNode;
  /** Rendered with data once loaded successfully. */
  children: (data: T) => ReactNode;
}

/**
 * Standardises the loading / error / success branches for a React Query
 * result. Empty-vs-populated is left to `children`, since "empty" differs per
 * view and may need a contextual call-to-action.
 */
export function QueryBoundary<T>({ query, loading, children }: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}
