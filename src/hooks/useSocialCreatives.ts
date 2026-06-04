/** React Query hooks for SocialCreative data (sheet: SocialCreatives). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_CONFIG, SHEET_NAMES } from '@/constants';
import type { SocialCreative, SocialCreativeInput, SocialPlatform } from '@/types';
import { optimisticListMutation, optimisticRecord } from './mutationUtils';

const SHEET = SHEET_NAMES.socialCreatives;
const KEY = queryKeys.socialCreatives.all;

/** All creatives, optionally narrowed by company and/or platform. */
export function useSocialCreatives(companyId?: string, platform?: SocialPlatform) {
  const needsFilter = Boolean(companyId || platform);
  return useQuery({
    queryKey: queryKeys.socialCreatives.all,
    queryFn: () => sheets.read<SocialCreative>(SHEET),
    staleTime: QUERY_CONFIG.staleTime,
    select: needsFilter
      ? (rows: SocialCreative[]) =>
          rows.filter(
            (r) =>
              (!companyId || r.companyId === companyId) &&
              (!platform || r.platform === platform)
          )
      : undefined,
  });
}

export function useCreateSocialCreative() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<SocialCreative, SocialCreativeInput, SocialCreative>({
      qc,
      queryKey: KEY,
      mutationFn: (input) => sheets.append<SocialCreative>(SHEET, input),
      apply: (rows, input) => [optimisticRecord<SocialCreative>(input), ...rows],
      successMessage: 'Creative added',
      errorFallback: 'Could not add creative',
    })
  );
}

export function useUpdateSocialCreative() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<SocialCreative, { id: string; fields: Partial<SocialCreativeInput> }>({
      qc,
      queryKey: KEY,
      mutationFn: ({ id, fields }) => sheets.update<SocialCreative>(SHEET, id, fields),
      apply: (rows, { id, fields }) =>
        rows.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : r)),
      successMessage: 'Creative updated',
      errorFallback: 'Could not update creative',
    })
  );
}

export function useDeleteSocialCreative() {
  const qc = useQueryClient();
  return useMutation(
    optimisticListMutation<SocialCreative, string>({
      qc,
      queryKey: KEY,
      mutationFn: (id) => sheets.remove(SHEET, id),
      apply: (rows, id) => rows.filter((r) => r.id !== id),
      successMessage: 'Creative deleted',
      errorFallback: 'Could not delete creative',
    })
  );
}
