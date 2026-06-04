/**
 * Zod schema + mapping helpers for the app-project create/edit form.
 * "Due date" maps to the `targetLaunchDate` column. On update we send only the
 * editable subset so columns not in the form (repoUrl, liveUrl, progress, …)
 * are preserved.
 */

import { z } from 'zod';
import { PROJECT_STAGE_VALUES } from '@/constants';
import type { AppProject, AppProjectInput, ProjectStage } from '@/types';
import { toDateInputValue } from '@/utils/date';

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120, 'Keep it under 120 characters'),
  companyId: z.string().min(1, 'Select a company'),
  stage: z.enum(PROJECT_STAGE_VALUES),
  description: z.string().max(2000, 'That description is very long'),
  nextAction: z.string().max(280, 'Keep it under 280 characters'),
  dueDate: z.string(),
  blocker: z.string().max(280, 'Keep it under 280 characters'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function projectFormDefaults(stage: ProjectStage = 'discovery'): ProjectFormValues {
  return {
    name: '',
    companyId: '',
    stage,
    description: '',
    nextAction: '',
    dueDate: '',
    blocker: '',
  };
}

export function projectToFormValues(project: AppProject): ProjectFormValues {
  return {
    name: project.name ?? '',
    companyId: project.companyId,
    stage: project.stage,
    description: project.description ?? '',
    nextAction: project.nextAction ?? '',
    dueDate: toDateInputValue(project.targetLaunchDate),
    blocker: project.blocker ?? '',
  };
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Editable subset, used for updates (preserves repo/live/progress/start). */
export function toEditableFields(values: ProjectFormValues): Partial<AppProjectInput> {
  return {
    name: values.name.trim(),
    companyId: values.companyId,
    stage: values.stage,
    description: blankToNull(values.description),
    nextAction: blankToNull(values.nextAction),
    targetLaunchDate: values.dueDate || null,
    blocker: blankToNull(values.blocker),
  };
}

/** Full payload for create. */
export function toCreateInput(values: ProjectFormValues): AppProjectInput {
  return {
    ...toEditableFields(values),
    progressPercent: null,
    repoUrl: null,
    liveUrl: null,
    startDate: null,
  } as AppProjectInput;
}
