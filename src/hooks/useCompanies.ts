/** React Query hooks for Company data (sheet: Companies). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_CONFIG, SHEET_NAMES } from '@/constants';
import type { Company, CompanyInput } from '@/types';
import { optimisticListMutation, optimisticRecord } from './mutationUtils';

const SHEET = SHEET_NAMES.companies;
const KEY = queryKeys.companies.all;

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: () => sheets.read<Company>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
  });
}

/** A single company, resolved from the cached list by id. */
export function useCompany(id: string) {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: () => sheets.read<Company>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
    select: (rows: Company[]) => rows.find((company) => company.id === id),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<Company, CompanyInput, Company>({
      qc,
      queryKey: KEY,
      mutationFn: (input) => sheets.append<Company>(SHEET, input),
      apply: (rows, input) => [optimisticRecord<Company>(input), ...rows],
      successMessage: 'Company added',
      errorFallback: 'Could not add company',
    })
  );
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<Company, { id: string; fields: Partial<CompanyInput> }>({
      qc,
      queryKey: KEY,
      mutationFn: ({ id, fields }) => sheets.update<Company>(SHEET, id, fields),
      apply: (rows, { id, fields }) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : r)),
      successMessage: 'Company updated',
      errorFallback: 'Could not update company',
    })
  );
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<Company, string>({
      qc,
      queryKey: KEY,
      mutationFn: (id) => sheets.remove(SHEET, id),
      apply: (rows, id) => rows.filter((r) => r.id !== id),
      successMessage: 'Company deleted',
      errorFallback: 'Could not delete company',
      // Removing a company can affect every dependent module's rollups.
      alsoInvalidate: [
        queryKeys.consultingSessions.all,
        queryKeys.appProjects.all,
        queryKeys.socialCreatives.all,
        queryKeys.followUps.all,
      ],
    })
  );
}
