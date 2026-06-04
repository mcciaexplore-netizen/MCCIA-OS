/**
 * Zod schema + mapping helpers for the social creative form. One submit can
 * target multiple platforms — the page loops `platforms` and creates one
 * record per platform.
 */

import { z } from 'zod';
import { CREATIVE_STATUS_VALUES, SOCIAL_PLATFORM_VALUES } from '@/constants';
import type { SocialCreative, SocialCreativeInput, SocialPlatform } from '@/types';
import { toDateInputValue } from '@/utils/date';

export const CAPTION_MAX = 2200;

export const creativeFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(160, 'Keep it under 160 characters'),
    companyId: z.string().min(1, 'Select a company'),
    platforms: z.array(z.enum(SOCIAL_PLATFORM_VALUES)).min(1, 'Pick at least one platform'),
    caption: z.string().max(CAPTION_MAX, `Caption must be under ${CAPTION_MAX} characters`),
    status: z.enum(CREATIVE_STATUS_VALUES),
    scheduledFor: z.string(),
    imageUrl: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'scheduled' && !values.scheduledFor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduledFor'],
        message: 'Set a scheduled date',
      });
    }
  });

export type CreativeFormValues = z.infer<typeof creativeFormSchema>;

export function creativeFormDefaults(): CreativeFormValues {
  return {
    title: '',
    companyId: '',
    platforms: [],
    caption: '',
    status: 'draft',
    scheduledFor: '',
    imageUrl: '',
  };
}

export function creativeToFormValues(creative: SocialCreative): CreativeFormValues {
  return {
    title: creative.title ?? '',
    companyId: creative.companyId,
    platforms: [creative.platform],
    caption: creative.caption ?? '',
    status: creative.status,
    scheduledFor: toDateInputValue(creative.scheduledFor),
    imageUrl: creative.imageUrl ?? '',
  };
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Build a create payload for a single platform. */
export function toCreateInput(values: CreativeFormValues, platform: SocialPlatform): SocialCreativeInput {
  return {
    companyId: values.companyId,
    title: values.title.trim(),
    platform,
    status: values.status,
    scheduledFor: values.scheduledFor || null,
    caption: blankToNull(values.caption),
    imageUrl: values.imageUrl.trim() || null,
    notes: null,
  };
}

/** Editable subset for updates (preserves `notes`). */
export function toEditableFields(
  values: CreativeFormValues,
  platform: SocialPlatform
): Partial<SocialCreativeInput> {
  return {
    companyId: values.companyId,
    title: values.title.trim(),
    platform,
    status: values.status,
    scheduledFor: values.scheduledFor || null,
    caption: blankToNull(values.caption),
    imageUrl: values.imageUrl.trim() || null,
  };
}
