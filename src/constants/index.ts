/**
 * Application-wide constants, config, sheet schema metadata, and the
 * label/option maps for the domain enum unions.
 */

import type {
  CompanyStatus,
  CreativeStatus,
  FollowUpStatus,
  Industry,
  ProjectStage,
  SessionOutcome,
  SocialPlatform,
} from '@/types';

export const APP_NAME = 'MCCIA Intern OS';
export const APP_TAGLINE = 'Your personal workspace at MCCIA';

/** localStorage keys. */
export const STORAGE_KEYS = {
  theme: 'mccia-theme',
  followUpInterval: 'mccia-followup-interval',
  timezone: 'mccia-timezone',
} as const;

/** Theme values. `system` follows the OS-level preference. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Route paths, kept in one place so navigation + links stay in sync. */
export const ROUTES = {
  dashboard: '/',
  consulting: '/consulting',
  appdev: '/app-development',
  social: '/social',
  companies: '/companies',
  settings: '/settings',
} as const;

/* ------------------------------------------------------------------ *
 * Sheet schema metadata
 * ------------------------------------------------------------------ */

/** Tab names in the backing spreadsheet. */
export const SHEET_NAMES = {
  companies: 'Companies',
  consultingSessions: 'ConsultingSessions',
  appProjects: 'AppProjects',
  socialCreatives: 'SocialCreatives',
  followUps: 'FollowUps',
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

/**
 * Columns that the client coerces from string → `number | null` after reading.
 * Keep in sync with the numeric fields in `src/types/index.ts`.
 */
export const SHEET_NUMBER_COLUMNS: Record<SheetName, string[]> = {
  Companies: [],
  ConsultingSessions: ['durationMinutes'],
  AppProjects: ['progressPercent'],
  SocialCreatives: [],
  FollowUps: [],
};

/* ------------------------------------------------------------------ *
 * Enum labels + select option lists
 * ------------------------------------------------------------------ */

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
};

/** Enum values as a tuple, for building Zod enums. */
export const COMPANY_STATUS_VALUES = [
  'active',
  'on_hold',
  'completed',
] as const satisfies readonly CompanyStatus[];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  manufacturing: 'Manufacturing',
  retail: 'Retail',
  agriculture: 'Agriculture',
  logistics: 'Logistics',
  technology: 'Technology',
  healthcare: 'Healthcare',
  education: 'Education',
  other: 'Other',
};

export const INDUSTRY_VALUES = [
  'manufacturing',
  'retail',
  'agriculture',
  'logistics',
  'technology',
  'healthcare',
  'education',
  'other',
] as const satisfies readonly Industry[];

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  discovery: 'Discovery',
  design: 'Design',
  build: 'Build',
  testing: 'Testing',
  delivered: 'Delivered',
};

/** Stage order = Kanban column order, left to right. */
export const PROJECT_STAGE_VALUES = [
  'discovery',
  'design',
  'build',
  'testing',
  'delivered',
] as const satisfies readonly ProjectStage[];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export const SOCIAL_PLATFORM_VALUES = [
  'instagram',
  'facebook',
  'linkedin',
  'whatsapp',
  'email',
] as const satisfies readonly SocialPlatform[];

export const CREATIVE_STATUS_LABELS: Record<CreativeStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  posted: 'Posted',
};

export const CREATIVE_STATUS_VALUES = [
  'draft',
  'scheduled',
  'posted',
] as const satisfies readonly CreativeStatus[];

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'Pending',
  done: 'Done',
};

export const SESSION_OUTCOME_LABELS: Record<SessionOutcome, string> = {
  positive: 'Positive',
  needs_follow_up: 'Needs Follow-up',
  no_decision: 'No Decision',
  escalated: 'Escalated',
};

export const SESSION_OUTCOME_VALUES = [
  'positive',
  'needs_follow_up',
  'no_decision',
  'escalated',
] as const satisfies readonly SessionOutcome[];

/** Helper to turn a label map into `{ value, label }[]` for <select> options. */
export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}

export const COMPANY_STATUS_OPTIONS = toOptions(COMPANY_STATUS_LABELS);
export const INDUSTRY_OPTIONS = toOptions(INDUSTRY_LABELS);
export const PROJECT_STAGE_OPTIONS = toOptions(PROJECT_STAGE_LABELS);
export const SOCIAL_PLATFORM_OPTIONS = toOptions(SOCIAL_PLATFORM_LABELS);
export const CREATIVE_STATUS_OPTIONS = toOptions(CREATIVE_STATUS_LABELS);
export const FOLLOW_UP_STATUS_OPTIONS = toOptions(FOLLOW_UP_STATUS_LABELS);
export const SESSION_OUTCOME_OPTIONS = toOptions(SESSION_OUTCOME_LABELS);

/* ------------------------------------------------------------------ *
 * React Query timings
 * ------------------------------------------------------------------ */

export const QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes
  retry: 2,
} as const;
