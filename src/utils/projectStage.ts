/**
 * Visual mappings for project stages and due dates.
 * Stage colours: Discovery=purple, Design=blue, Build=amber, Testing=coral,
 * Delivered=green.
 */

import type { ProjectStage } from '@/types';
import { getDaysUntil } from './followup';

export const STAGE_BADGE_CLASSES: Record<ProjectStage, string> = {
  discovery: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  design: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  build: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  testing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

/** Solid accent colour used for the Kanban column header bar. */
export const STAGE_ACCENT: Record<ProjectStage, string> = {
  discovery: 'bg-violet-500',
  design: 'bg-blue-500',
  build: 'bg-amber-500',
  testing: 'bg-orange-500',
  delivered: 'bg-emerald-500',
};

export type DueTone = 'past' | 'near' | 'normal';

/** Past = overdue, near = within a week, else normal. */
export function getDueTone(date: string | null): DueTone {
  if (!date) return 'normal';
  const days = getDaysUntil(date);
  if (Number.isNaN(days)) return 'normal';
  if (days < 0) return 'past';
  if (days <= 7) return 'near';
  return 'normal';
}

export const DUE_TONE_CLASSES: Record<DueTone, string> = {
  past: 'text-rose-600 dark:text-rose-400',
  near: 'text-amber-600 dark:text-amber-400',
  normal: 'text-slate-500 dark:text-slate-400',
};
