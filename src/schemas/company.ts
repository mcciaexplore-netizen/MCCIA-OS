/**
 * Zod schema + mapping helpers for the company create/edit form.
 *
 * Form values are kept as plain strings (controlled inputs); empty strings are
 * normalised to `null` when mapping to the API payload. On update we send only
 * the editable subset so columns not in the form (website, notes) are preserved.
 */

import { z } from 'zod';
import { COMPANY_STATUS_VALUES, INDUSTRY_VALUES } from '@/constants';
import type { Company, CompanyInput } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(120, 'Keep it under 120 characters'),
  contactName: z.string().trim().max(120, 'Keep it under 120 characters'),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .refine((v) => v === '' || EMAIL_RE.test(v), 'Enter a valid email address'),
  contactPhone: z.string().trim().max(40, 'Keep it under 40 characters'),
  industry: z.enum(INDUSTRY_VALUES),
  status: z.enum(COMPANY_STATUS_VALUES),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

/** Initial values for the "add company" form. */
export const companyFormDefaults: CompanyFormValues = {
  name: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  industry: 'technology',
  status: 'active',
};

/** Hydrate the form from an existing company (edit mode). */
export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name ?? '',
    contactName: company.contactName ?? '',
    contactEmail: company.contactEmail ?? '',
    contactPhone: company.contactPhone ?? '',
    industry: company.industry ?? 'other',
    status: company.status,
  };
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** The editable subset, used for updates (preserves website/notes). */
export function toEditableFields(values: CompanyFormValues): Partial<CompanyInput> {
  return {
    name: values.name.trim(),
    status: values.status,
    industry: values.industry,
    contactName: blankToNull(values.contactName),
    contactEmail: blankToNull(values.contactEmail),
    contactPhone: blankToNull(values.contactPhone),
  };
}

/** Full payload for create (new record → optional columns start empty). */
export function toCreateInput(values: CompanyFormValues): CompanyInput {
  return {
    ...toEditableFields(values),
    website: null,
    notes: null,
    // Imported-only columns; null for companies added through the form.
    udyamNumber: null,
    district: null,
    acquisitionSource: null,
    ramp: null,
    membership: null,
    membershipVerified: null,
  } as CompanyInput;
}
