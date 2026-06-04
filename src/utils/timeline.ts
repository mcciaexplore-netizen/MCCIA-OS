/** Merges a company's records into a single chronological activity feed. */

import { PROJECT_STAGE_LABELS, SOCIAL_PLATFORM_LABELS } from '@/constants';
import type { AppProject, ConsultingSession, SocialCreative } from '@/types';

export type TimelineKind = 'session' | 'project' | 'creative';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  date: string | null;
  title: string;
  subtitle: string;
}

/**
 * Combine sessions, projects, and creatives into one feed sorted newest-first.
 * Each item falls back to its `createdAt` when its domain date is missing.
 */
export function buildTimeline(
  sessions: ConsultingSession[],
  projects: AppProject[],
  creatives: SocialCreative[]
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...sessions.map((s) => ({
      id: `session-${s.id}`,
      kind: 'session' as const,
      date: s.date ?? s.createdAt,
      title: s.title,
      subtitle: 'Consulting session',
    })),
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      kind: 'project' as const,
      date: p.startDate ?? p.createdAt,
      title: p.name,
      subtitle: `Project · ${PROJECT_STAGE_LABELS[p.stage]}`,
    })),
    ...creatives.map((c) => ({
      id: `creative-${c.id}`,
      kind: 'creative' as const,
      date: c.scheduledFor ?? c.createdAt,
      title: c.title,
      subtitle: `Creative · ${SOCIAL_PLATFORM_LABELS[c.platform]}`,
    })),
  ];

  // ISO-8601 strings sort lexicographically; missing dates sink to the bottom.
  return items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
