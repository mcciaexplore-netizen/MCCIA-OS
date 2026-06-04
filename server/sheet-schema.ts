/**
 * Canonical header row for every tab in the backing spreadsheet, in column
 * order. The first three columns are always `id`, `createdAt`, `updatedAt`
 * (managed by `sheets-handler`); the rest mirror the field order in
 * `src/types/index.ts`. Keep this in sync with those interfaces.
 *
 * Used by `scripts/setup-sheet.ts` to create/validate the tabs. Insertion order
 * here is the tab creation order.
 */
export const SHEET_HEADERS: Record<string, string[]> = {
  Companies: [
    'id',
    'createdAt',
    'updatedAt',
    'name',
    'status',
    'industry',
    'website',
    'contactName',
    'contactEmail',
    'contactPhone',
    'notes',
  ],
  ConsultingSessions: [
    'id',
    'createdAt',
    'updatedAt',
    'companyId',
    'title',
    'date',
    'durationMinutes',
    'outcome',
    'summary',
    'actionItems',
    'notes',
  ],
  AppProjects: [
    'id',
    'createdAt',
    'updatedAt',
    'companyId',
    'name',
    'stage',
    'progressPercent',
    'repoUrl',
    'liveUrl',
    'startDate',
    'targetLaunchDate',
    'description',
    'nextAction',
    'blocker',
  ],
  SocialCreatives: [
    'id',
    'createdAt',
    'updatedAt',
    'companyId',
    'title',
    'platform',
    'status',
    'scheduledFor',
    'caption',
    'imageUrl',
    'notes',
  ],
  FollowUps: [
    'id',
    'createdAt',
    'updatedAt',
    'companyId',
    'title',
    'status',
    'dueDate',
    'relatedType',
    'relatedId',
    'notes',
  ],
};
