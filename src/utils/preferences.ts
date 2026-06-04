/**
 * Lightweight, localStorage-backed user preferences that aren't tied to a
 * specific record (default follow-up interval, timezone). Theme lives in its
 * own provider; see {@link ThemeProvider}.
 */

import { STORAGE_KEYS } from '@/constants';
import { FOLLOWUP_INTERVAL_VALUES } from '@/schemas/session';

export type FollowUpIntervalPref = (typeof FOLLOWUP_INTERVAL_VALUES)[number];

export const DEFAULT_FOLLOWUP_INTERVAL: FollowUpIntervalPref = '14';

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

/** Default interval pre-selected when a new session needs a follow-up. */
export function getFollowUpIntervalPref(): FollowUpIntervalPref {
  const stored = read(STORAGE_KEYS.followUpInterval);
  return (FOLLOWUP_INTERVAL_VALUES as readonly string[]).includes(stored ?? '')
    ? (stored as FollowUpIntervalPref)
    : DEFAULT_FOLLOWUP_INTERVAL;
}

export function setFollowUpIntervalPref(value: FollowUpIntervalPref): void {
  window.localStorage.setItem(STORAGE_KEYS.followUpInterval, value);
}

/** The browser's own timezone, used as the default selection. */
export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getTimezonePref(): string {
  return read(STORAGE_KEYS.timezone) ?? getSystemTimezone();
}

export function setTimezonePref(value: string): void {
  window.localStorage.setItem(STORAGE_KEYS.timezone, value);
}

/** List of selectable timezones, falling back to a small common set. */
export function listTimezones(): string[] {
  const supported = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (typeof supported === 'function') {
    try {
      return supported('timeZone');
    } catch {
      /* fall through */
    }
  }
  return [
    'UTC',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
}
