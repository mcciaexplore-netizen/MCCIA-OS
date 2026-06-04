/**
 * Core domain types for MCCIA Intern OS.
 *
 * Each interface mirrors the column schema of one tab in the backing Google
 * Sheet (header row = field names). The first three columns of every sheet are
 * `id`, `createdAt`, `updatedAt` and are managed by the server (`sheets-handler`).
 *
 * Convention: optional text columns are `string | null` ('' in the sheet maps
 * to `null`); numeric columns (declared in `SHEET_NUMBER_COLUMNS`) are
 * `number | null`.
 */

/* ------------------------------------------------------------------ *
 * Enum union types
 * ------------------------------------------------------------------ */

/** Lifecycle of a client relationship. */
export type CompanyStatus = 'active' | 'on_hold' | 'completed';

/** Sector a company operates in (drives the industry badge colour). */
export type Industry =
  | 'manufacturing'
  | 'retail'
  | 'agriculture'
  | 'logistics'
  | 'technology'
  | 'healthcare'
  | 'education'
  | 'other';

/** Lifecycle stage of an app development project (Kanban columns). */
export type ProjectStage = 'discovery' | 'design' | 'build' | 'testing' | 'delivered';

/** Social platforms a creative can target. */
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'whatsapp' | 'email';

/** Status of a social media creative. */
export type CreativeStatus = 'draft' | 'scheduled' | 'posted';

/** Result of a consulting session. */
export type SessionOutcome = 'positive' | 'needs_follow_up' | 'no_decision' | 'escalated';

/** Whether a follow-up still needs action. */
export type FollowUpStatus = 'pending' | 'done';

/** What a follow-up is attached to. */
export type FollowUpRelatedType = 'company' | 'session' | 'project' | 'creative' | 'general';

/* ------------------------------------------------------------------ *
 * Sheet-backed records
 * ------------------------------------------------------------------ */

/** Columns every sheet shares, in order. */
export interface BaseRecord {
  id: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** Sheet: `Companies`. A client the intern works with across modules. */
export interface Company extends BaseRecord {
  name: string;
  status: CompanyStatus;
  industry: Industry | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  /** MSME UDYAM registration number. */
  udyamNumber: string | null;
  /** District / location the company operates from. */
  district: string | null;
  /** How the company was acquired (lead source). */
  acquisitionSource: string | null;
  /** Whether the company is under the RAMP scheme (free text: "RAMP" / "Non-RAMP"). */
  ramp: string | null;
  /** MCCIA membership status (free text: "Member" / "Non Member"). */
  membership: string | null;
  /** Membership verification note (the "verified version" column). */
  membershipVerified: string | null;
}

/** Sheet: `ConsultingSessions`. A consulting meeting / deliverable. */
export interface ConsultingSession extends BaseRecord {
  companyId: string;
  title: string; // topic / agenda (← "Meeting Query")
  date: string | null; // ISO-8601 (date)
  durationMinutes: number | null;
  outcome: SessionOutcome | null;
  summary: string | null; // ← "Meeting Solution"
  actionItems: string | null;
  notes: string | null;
  /** Consultant / HOD assigned to this session. */
  consultant: string | null;
  /** Mode of consultation (free text: "Online" / "Offline" / "Telephonic" …). */
  mode: string | null;
  /** Booked time slot for the meeting. */
  timeSlot: string | null;
  /** Payment note / status for this consultation. */
  payment: string | null;
  /** Consulting domain / subject area. */
  domain: string | null;
  /** Raw consultation status text from the source sheet. */
  consultationStatus: string | null;
}

/** Sheet: `AppProjects`. An app being built for a company. */
export interface AppProject extends BaseRecord {
  companyId: string;
  name: string;
  stage: ProjectStage;
  progressPercent: number | null;
  repoUrl: string | null;
  liveUrl: string | null;
  startDate: string | null; // ISO-8601 (date)
  targetLaunchDate: string | null; // ISO-8601 (date) — used as the "due date"
  description: string | null;
  nextAction: string | null;
  blocker: string | null;
}

/** Sheet: `SocialCreatives`. A social media post / creative. */
export interface SocialCreative extends BaseRecord {
  companyId: string;
  title: string;
  platform: SocialPlatform;
  status: CreativeStatus;
  scheduledFor: string | null; // ISO-8601 (date)
  caption: string | null;
  imageUrl: string | null; // base64 data URI for small images, or an external/Drive link
  notes: string | null;
}

/** Sheet: `FollowUps`. A task/reminder linked to a company (or its work). */
export interface FollowUp extends BaseRecord {
  companyId: string;
  title: string;
  status: FollowUpStatus;
  dueDate: string | null; // ISO-8601 (date)
  relatedType: FollowUpRelatedType | null;
  relatedId: string | null;
  notes: string | null;
}

/** Any of the sheet-backed record types. */
export type SheetRecord =
  | Company
  | ConsultingSession
  | AppProject
  | SocialCreative
  | FollowUp;

/* ------------------------------------------------------------------ *
 * Derived UI types
 * ------------------------------------------------------------------ */

/** A company enriched with rollup counts for list/detail views. */
export interface CompanyWithStats extends Company {
  sessionCount: number;
  projectCount: number;
  creativeCount: number;
  pendingFollowUpCount: number;
}

/* ------------------------------------------------------------------ *
 * Mutation inputs (server fills id + timestamps)
 * ------------------------------------------------------------------ */

export type CompanyInput = Omit<Company, keyof BaseRecord>;
export type ConsultingSessionInput = Omit<ConsultingSession, keyof BaseRecord>;
export type AppProjectInput = Omit<AppProject, keyof BaseRecord>;
export type SocialCreativeInput = Omit<SocialCreative, keyof BaseRecord>;
export type FollowUpInput = Omit<FollowUp, keyof BaseRecord>;
