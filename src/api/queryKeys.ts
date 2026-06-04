/**
 * Centralised React Query keys. Filters (companyId, platform, …) are applied
 * via `select` on top of these base keys, so a single cached read per sheet
 * serves every filtered view.
 */

export const queryKeys = {
  companies: {
    all: ['companies'] as const,
  },
  consultingSessions: {
    all: ['consultingSessions'] as const,
  },
  appProjects: {
    all: ['appProjects'] as const,
  },
  socialCreatives: {
    all: ['socialCreatives'] as const,
  },
  followUps: {
    all: ['followUps'] as const,
  },
} as const;
