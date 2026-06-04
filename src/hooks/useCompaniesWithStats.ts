/**
 * Composes the company list with rollup counts from the other modules into the
 * derived `CompanyWithStats` shape. Returns a single status object so views can
 * branch on loading / error just like a plain query.
 */

import { useMemo } from 'react';
import type { CompanyWithStats } from '@/types';
import { useCompanies } from './useCompanies';
import { useConsultingSessions } from './useConsultingSessions';
import { useAppProjects } from './useAppProjects';
import { useSocialCreatives } from './useSocialCreatives';
import { useFollowUps } from './useFollowUps';

export function useCompaniesWithStats() {
  const companies = useCompanies();
  const sessions = useConsultingSessions();
  const projects = useAppProjects();
  const creatives = useSocialCreatives();
  const followUps = useFollowUps();

  const queries = [companies, sessions, projects, creatives, followUps];

  const data = useMemo<CompanyWithStats[] | undefined>(() => {
    if (!companies.data) return undefined;

    const countBy = <T extends { companyId: string }>(rows: T[] | undefined) => {
      const map = new Map<string, number>();
      for (const row of rows ?? []) map.set(row.companyId, (map.get(row.companyId) ?? 0) + 1);
      return map;
    };

    const sessionCounts = countBy(sessions.data);
    const projectCounts = countBy(projects.data);
    const creativeCounts = countBy(creatives.data);
    const pendingFollowUps = countBy(followUps.data?.filter((f) => f.status === 'pending'));

    return companies.data.map((company) => ({
      ...company,
      sessionCount: sessionCounts.get(company.id) ?? 0,
      projectCount: projectCounts.get(company.id) ?? 0,
      creativeCount: creativeCounts.get(company.id) ?? 0,
      pendingFollowUpCount: pendingFollowUps.get(company.id) ?? 0,
    }));
  }, [companies.data, sessions.data, projects.data, creatives.data, followUps.data]);

  return {
    data,
    isPending: queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
    error: queries.find((q) => q.isError)?.error ?? null,
    refetch: () => queries.forEach((q) => void q.refetch()),
  };
}
