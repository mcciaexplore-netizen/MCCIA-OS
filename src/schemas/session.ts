/**
 * Zod schema + mapping helpers for the Log Session form. A single submit can
 * produce two records: a ConsultingSession and (optionally) a FollowUp.
 */

import { z } from 'zod';
import { format } from 'date-fns';
import { SESSION_OUTCOME_VALUES } from '@/constants';
import type { ConsultingSessionInput, FollowUpInput } from '@/types';

export const FOLLOWUP_INTERVAL_VALUES = ['7', '14', '30', 'custom'] as const;

export const sessionFormSchema = z
  .object({
    companyId: z.string().min(1, 'Select a company'),
    date: z.string().min(1, 'Pick a session date'),
    topic: z.string().trim().min(1, 'Topic is required').max(160, 'Keep it under 160 characters'),
    notes: z.string().max(4000, 'That is a very long note'),
    outcome: z.enum(SESSION_OUTCOME_VALUES),
    followUpRequired: z.boolean(),
    followUpInterval: z.enum(FOLLOWUP_INTERVAL_VALUES),
    followUpDate: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.followUpRequired && !values.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['followUpDate'],
        message: 'Set a follow-up date',
      });
    }
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

/**
 * Fresh defaults (session date defaults to today). The follow-up interval can
 * be seeded from the user's saved preference; callers pass it in to keep this
 * schema module free of UI/preference dependencies.
 */
export function sessionFormDefaults(
  followUpInterval: SessionFormValues['followUpInterval'] = '14'
): SessionFormValues {
  return {
    companyId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    topic: '',
    notes: '',
    outcome: 'positive',
    followUpRequired: false,
    followUpInterval,
    followUpDate: '',
  };
}

/** Map the form to a ConsultingSession create payload. */
export function toSessionInput(values: SessionFormValues): ConsultingSessionInput {
  return {
    companyId: values.companyId,
    title: values.topic.trim(),
    date: values.date || null,
    durationMinutes: null,
    outcome: values.outcome,
    summary: null,
    actionItems: null,
    notes: values.notes.trim() || null,
    // Consultation metadata is only captured on bulk import; null for manual logs.
    consultant: null,
    mode: null,
    timeSlot: null,
    payment: null,
    domain: null,
    consultationStatus: null,
  };
}

/** Map the form to a FollowUp create payload, linked to the new session. */
export function toFollowUpInput(values: SessionFormValues, sessionId: string): FollowUpInput {
  return {
    companyId: values.companyId,
    title: values.topic.trim(),
    status: 'pending',
    dueDate: values.followUpDate || null,
    relatedType: 'session',
    relatedId: sessionId,
    notes: null,
  };
}
