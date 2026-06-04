/**
 * Date formatting and relative-time helpers built on date-fns.
 */

import { format, formatDistanceToNowStrict, isPast, isValid, parseISO } from 'date-fns';

/** Safely parse an ISO string; returns null for empty/invalid input. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** Format a date as e.g. "2 Jun 2026". Returns a dash for empty values. */
export function formatDate(value: string | null | undefined, fallback = '—'): string {
  const date = parseDate(value);
  return date ? format(date, 'd MMM yyyy') : fallback;
}

/** Format a date-time as e.g. "2 Jun 2026, 3:45 PM". */
export function formatDateTime(value: string | null | undefined, fallback = '—'): string {
  const date = parseDate(value);
  return date ? format(date, "d MMM yyyy, h:mm a") : fallback;
}

/** Format a date as e.g. "Tuesday, 3 June 2026" for headers. Defaults to today. */
export function formatLongDate(value?: string | null): string {
  const date = parseDate(value) ?? new Date();
  return format(date, 'EEEE, d MMMM yyyy');
}

/** Relative time, e.g. "3 days ago" / "in 2 hours". */
export function formatRelative(value: string | null | undefined, fallback = '—'): string {
  const date = parseDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : fallback;
}

/** True if the given date is in the past (used for overdue logic). */
export function isOverdue(value: string | null | undefined): boolean {
  const date = parseDate(value);
  return date ? isPast(date) : false;
}

/** Convert a Date to the `yyyy-MM-dd` value used by <input type="date">. */
export function toDateInputValue(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, 'yyyy-MM-dd') : '';
}
