import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NotConfiguredError } from '@/api/errors';
import type { BaseRecord } from '@/types';

/** Friendly message for a mutation/query error, used by toasts. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof NotConfiguredError) return 'Connect your Google Sheet first (see .env.example).';
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** A temporary client-side id for an optimistically-added row. */
export function tempId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `temp-${rand}`;
}

interface OptimisticContext<TRow> {
  previous: TRow[] | undefined;
}

/**
 * Build the side-effect callbacks for an optimistic list mutation:
 * snapshot → patch the cached array immediately → roll back on error →
 * invalidate on settle so the server's truth replaces the optimistic state.
 *
 * Every data hook shares this so the UI updates instantly on create / update /
 * delete and self-heals if the Sheets write fails.
 */
export function optimisticListMutation<TRow extends BaseRecord, TVars, TData = unknown>(config: {
  qc: QueryClient;
  queryKey: readonly unknown[];
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Return the next array given the current rows + mutation variables. */
  apply: (rows: TRow[], vars: TVars) => TRow[];
  successMessage: string;
  errorFallback: string;
  /** Additional query keys to invalidate on settle (e.g. cascade deletes). */
  alsoInvalidate?: readonly (readonly unknown[])[];
}): UseMutationOptions<TData, Error, TVars, OptimisticContext<TRow>> {
  const { qc, queryKey, mutationFn, apply, successMessage, errorFallback, alsoInvalidate } = config;
  return {
    mutationFn,
    onMutate: async (vars): Promise<OptimisticContext<TRow>> => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<TRow[]>(queryKey);
      if (previous) qc.setQueryData<TRow[]>(queryKey, apply(previous, vars));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous);
      toast.error(errorMessage(error, errorFallback));
    },
    onSuccess: () => {
      toast.success(successMessage);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey });
      alsoInvalidate?.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
    },
  };
}

/** Optimistically build a full record from a create input (temp id + timestamps). */
export function optimisticRecord<TRow extends BaseRecord>(input: Omit<TRow, keyof BaseRecord>): TRow {
  const now = new Date().toISOString();
  return { ...input, id: tempId(), createdAt: now, updatedAt: now } as TRow;
}
