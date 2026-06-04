/** React Query hooks for ConsultingSession data (sheet: ConsultingSessions). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_CONFIG, SHEET_NAMES } from '@/constants';
import type { ConsultingSession, ConsultingSessionInput } from '@/types';
import { optimisticListMutation, optimisticRecord } from './mutationUtils';

const SHEET = SHEET_NAMES.consultingSessions;
const KEY = queryKeys.consultingSessions.all;

/** All sessions, optionally narrowed to one company (filtered from cache). */
export function useConsultingSessions(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.consultingSessions.all,
    queryFn: () => sheets.read<ConsultingSession>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
    select: companyId
      ? (rows: ConsultingSession[]) => rows.filter((r) => r.companyId === companyId)
      : undefined,
  });
}

export function useCreateConsultingSession() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<ConsultingSession, ConsultingSessionInput, ConsultingSession>({
      qc,
      queryKey: KEY,
      mutationFn: (input) => sheets.append<ConsultingSession>(SHEET, input),
      apply: (rows, input) => [optimisticRecord<ConsultingSession>(input), ...rows],
      successMessage: 'Session logged',
      errorFallback: 'Could not log session',
    })
  );
}

export function useUpdateConsultingSession() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<ConsultingSession, { id: string; fields: Partial<ConsultingSessionInput> }>({
      qc,
      queryKey: KEY,
      mutationFn: ({ id, fields }) => sheets.update<ConsultingSession>(SHEET, id, fields),
      apply: (rows, { id, fields }) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : r)),
      successMessage: 'Session updated',
      errorFallback: 'Could not update session',
    })
  );
}

export function useDeleteConsultingSession() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<ConsultingSession, string>({
      qc,
      queryKey: KEY,
      mutationFn: (id) => sheets.remove(SHEET, id),
      apply: (rows, id) => rows.filter((r) => r.id !== id),
      successMessage: 'Session deleted',
      errorFallback: 'Could not delete session',
    })
  );
}
