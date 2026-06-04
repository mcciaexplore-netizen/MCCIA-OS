/**
 * Keep open tabs in sync. The `storage` event fires in *other* tabs when this
 * origin's localStorage changes, so when one tab writes a sheet we invalidate
 * the matching React Query cache in the others — no more stale cross-tab views.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { SHEET_NAMES } from '@/constants';

const PREFIX = 'mccia:data:';

const SHEET_TO_KEY: Record<string, readonly unknown[]> = {
  [SHEET_NAMES.companies]: queryKeys.companies.all,
  [SHEET_NAMES.consultingSessions]: queryKeys.consultingSessions.all,
  [SHEET_NAMES.appProjects]: queryKeys.appProjects.all,
  [SHEET_NAMES.socialCreatives]: queryKeys.socialCreatives.all,
  [SHEET_NAMES.followUps]: queryKeys.followUps.all,
};

export function useStorageSync(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith(PREFIX)) return;
      if (event.key.includes(':corrupt:')) return; // recovery backups, ignore
      const sheet = event.key.slice(PREFIX.length);
      const key = SHEET_TO_KEY[sheet];
      void qc.invalidateQueries(key ? { queryKey: key } : undefined);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [qc]);
}
