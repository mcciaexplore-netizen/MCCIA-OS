/** React Query hooks for FollowUp data (sheet: FollowUps). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_CONFIG, SHEET_NAMES } from '@/constants';
import type { FollowUp, FollowUpInput } from '@/types';
import { optimisticListMutation, optimisticRecord } from './mutationUtils';

const SHEET = SHEET_NAMES.followUps;
const KEY = queryKeys.followUps.all;

/** All follow-ups, optionally limited to those still pending. */
export function useFollowUps(onlyPending?: boolean) {
  return useQuery({
    queryKey: queryKeys.followUps.all,
    queryFn: () => sheets.read<FollowUp>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
    select: onlyPending
      ? (rows: FollowUp[]) => rows.filter((r) => r.status === 'pending')
      : undefined,
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<FollowUp, FollowUpInput, FollowUp>({
      qc,
      queryKey: KEY,
      mutationFn: (input) => sheets.append<FollowUp>(SHEET, input),
      apply: (rows, input) => [optimisticRecord<FollowUp>(input), ...rows],
      successMessage: 'Follow-up added',
      errorFallback: 'Could not add follow-up',
    })
  );
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<FollowUp, { id: string; fields: Partial<FollowUpInput> }>({
      qc,
      queryKey: KEY,
      mutationFn: ({ id, fields }) => sheets.update<FollowUp>(SHEET, id, fields),
      apply: (rows, { id, fields }) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : r)),
      successMessage: 'Follow-up updated',
      errorFallback: 'Could not update follow-up',
    })
  );
}

export function useDeleteFollowUp() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<FollowUp, string>({
      qc,
      queryKey: KEY,
      mutationFn: (id) => sheets.remove(SHEET, id),
      apply: (rows, id) => rows.filter((r) => r.id !== id),
      successMessage: 'Follow-up deleted',
      errorFallback: 'Could not delete follow-up',
    })
  );
}
