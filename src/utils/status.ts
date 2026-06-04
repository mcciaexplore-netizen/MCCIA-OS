/**
 * Status → visual-tone mapping. Components translate a `tone` into Tailwind
 * classes (see `TONE_CLASSES`) so colours stay consistent across every badge.
 */

import type { CompanyStatus, FollowUpStatus, SessionOutcome } from '@/types';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

/** Tailwind classes for each tone, dark-mode aware. */
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  accent: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
};

export function companyStatusTone(status: CompanyStatus): Tone {
  switch (status) {
    case 'active':
      return 'success';
    case 'on_hold':
      return 'warning';
    case 'completed':
    default:
      return 'neutral';
  }
}

/** Left-border accent for company cards, by status. */
export const COMPANY_STATUS_BORDER: Record<CompanyStatus, string> = {
  active: 'border-l-emerald-500',
  on_hold: 'border-l-amber-500',
  completed: 'border-l-slate-400 dark:border-l-slate-600',
};

export function followUpStatusTone(status: FollowUpStatus): Tone {
  return status === 'pending' ? 'warning' : 'success';
}

export function sessionOutcomeTone(outcome: SessionOutcome): Tone {
  switch (outcome) {
    case 'positive':
      return 'success';
    case 'needs_follow_up':
      return 'warning';
    case 'escalated':
      return 'danger';
    case 'no_decision':
    default:
      return 'neutral';
  }
}
