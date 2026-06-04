/**
 * Follow-up urgency logic: how close (or overdue) a follow-up date is, the
 * colours/labels that represent it, and helpers for resolving the active
 * follow-up of a session and computing follow-up dates from intervals.
 */

import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { FollowUp } from '@/types';
import { parseDate } from './date';

export type FollowUpUrgency = 'overdue' | 'today' | 'this_week' | 'upcoming' | 'done';

/** Whole-day difference from today; negative means the date is in the past. */
export function getDaysUntil(date: string): number {
  const parsed = parseDate(date);
  if (!parsed) return Number.NaN;
  return differenceInCalendarDays(parsed, new Date());
}

/**
 * Urgency of a follow-up given its date. Pass `isDone` to short-circuit to the
 * 'done' state (the date alone can't tell you it was completed).
 */
export function getFollowUpStatus(followupDate: string, isDone = false): FollowUpUrgency {
  if (isDone) return 'done';
  const days = getDaysUntil(followupDate);
  if (Number.isNaN(days)) return 'upcoming';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'this_week';
  return 'upcoming';
}

export const FOLLOWUP_LABELS: Record<FollowUpUrgency, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  this_week: 'Due Soon',
  upcoming: 'Scheduled',
  done: 'Done',
};

/** overdue=red, today=orange, this_week=amber, upcoming=green, done=gray. */
export const FOLLOWUP_BADGE_CLASSES: Record<FollowUpUrgency, string> = {
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  today: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  this_week: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  upcoming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  done: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const URGENCY_RANK: Record<FollowUpUrgency, number> = {
  overdue: 0,
  today: 1,
  this_week: 2,
  upcoming: 3,
  done: 5,
};

/** Sort weight; lower = more urgent. Sessions with no follow-up sit at 4. */
export function urgencyRank(urgency: FollowUpUrgency | null): number {
  return urgency === null ? 4 : URGENCY_RANK[urgency];
}

export interface SessionFollowUpState {
  /** The follow-up that drives the row badge (pending if any, else latest done). */
  followUp: FollowUp | null;
  /** The active pending follow-up, if one exists. */
  pending: FollowUp | null;
  /** Urgency to display, or null when the session has no follow-up. */
  urgency: FollowUpUrgency | null;
}

/** Resolve the follow-up that represents a session's current state. */
export function resolveSessionFollowUp(
  sessionId: string,
  followUps: FollowUp[]
): SessionFollowUpState {
  const related = followUps.filter(
    (f) => f.relatedType === 'session' && f.relatedId === sessionId
  );

  const pending =
    related
      .filter((f) => f.status === 'pending')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0] ?? null;

  if (pending) {
    return { followUp: pending, pending, urgency: getFollowUpStatus(pending.dueDate ?? '') };
  }

  const lastDone =
    related
      .filter((f) => f.status === 'done')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

  if (lastDone) return { followUp: lastDone, pending: null, urgency: 'done' };
  return { followUp: null, pending: null, urgency: null };
}

export const FOLLOWUP_INTERVALS = [
  { value: '7', label: '7 days', days: 7 },
  { value: '14', label: '14 days', days: 14 },
  { value: '30', label: '30 days', days: 30 },
  { value: 'custom', label: 'Custom', days: 0 },
] as const;

export type FollowUpInterval = (typeof FOLLOWUP_INTERVALS)[number]['value'];

/** Date (yyyy-MM-dd) `intervalDays` after the given base date. */
export function computeFollowUpDate(baseDate: string, intervalDays: number): string {
  const base = parseDate(baseDate) ?? new Date();
  return format(addDays(base, intervalDays), 'yyyy-MM-dd');
}
