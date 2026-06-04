/** React Query hooks for AppProject data (sheet: AppProjects). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_CONFIG, SHEET_NAMES } from '@/constants';
import type { AppProject, AppProjectInput } from '@/types';
import { optimisticListMutation, optimisticRecord } from './mutationUtils';

const SHEET = SHEET_NAMES.appProjects;
const KEY = queryKeys.appProjects.all;

/** All projects, optionally narrowed to one company (filtered from cache). */
export function useAppProjects(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.appProjects.all,
    queryFn: () => sheets.read<AppProject>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
    select: companyId
      ? (rows: AppProject[]) => rows.filter((r) => r.companyId === companyId)
      : undefined,
  });
}

export function useCreateAppProject() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<AppProject, AppProjectInput, AppProject>({
      qc,
      queryKey: KEY,
      mutationFn: (input) => sheets.append<AppProject>(SHEET, input),
      apply: (rows, input) => [optimisticRecord<AppProject>(input), ...rows],
      successMessage: 'Project created',
      errorFallback: 'Could not create project',
    })
  );
}

export function useUpdateAppProject() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<AppProject, { id: string; fields: Partial<AppProjectInput> }>({
      qc,
      queryKey: KEY,
      mutationFn: ({ id, fields }) => sheets.update<AppProject>(SHEET, id, fields),
      apply: (rows, { id, fields }) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : r)),
      successMessage: 'Project updated',
      errorFallback: 'Could not update project',
    })
  );
}

export function useDeleteAppProject() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<AppProject, string>({
      qc,
      queryKey: KEY,
      mutationFn: (id) => sheets.remove(SHEET, id),
      apply: (rows, id) => rows.filter((r) => r.id !== id),
      successMessage: 'Project deleted',
      errorFallback: 'Could not delete project',
    })
  );
}
