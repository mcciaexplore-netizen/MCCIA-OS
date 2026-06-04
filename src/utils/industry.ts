/** Per-industry badge colours, so each sector reads consistently everywhere. */

import type { Industry } from '@/types';

export const INDUSTRY_BADGE_CLASSES: Record<Industry, string> = {
  manufacturing: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  retail: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  agriculture: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  logistics: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  technology: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  healthcare: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  education: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
