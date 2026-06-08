import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton';
import { FormField, SelectInput, TextInput } from '@/components/form/fields';
import { COMPANY_STATUS_OPTIONS, INDUSTRY_OPTIONS } from '@/constants';
import { useCreateCompany, useDeleteCompany, useUpdateCompany } from '@/hooks/useCompanies';
import {
  companyFormDefaults,
  companyFormSchema,
  companyToFormValues,
  toCreateInput,
  toEditableFields,
  type CompanyFormValues,
} from '@/schemas/company';
import type { Company } from '@/types';

const FORM_ID = 'company-form';

interface CompanyDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer edits this company instead of creating one. */
  company?: Company;
  /** Called after the company is deleted (e.g. to navigate away from its page). */
  onDeleted?: () => void;
}

/**
 * Slide-over form for creating or editing a company. Validation is real-time
 * (`mode: 'onChange'`); the submit button stays disabled until the form is
 * valid. Success/error toasts are fired by the underlying mutation hooks.
 */
export function CompanyDrawer({ open, onClose, company, onDeleted }: CompanyDrawerProps) {
  const isEdit = Boolean(company);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const handleDelete = async () => {
    if (!company) return;
    try {
      await deleteCompany.mutateAsync(company.id);
      onClose();
      onDeleted?.();
    } catch {
      // Error toast handled by the mutation hook; keep the drawer open.
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    mode: 'onChange',
    defaultValues: companyFormDefaults,
  });

  // Hydrate (or clear) the form each time the drawer opens. In edit mode we
  // validate immediately so the Save button is enabled for an already-valid
  // record; create mode stays pristine so no "required" error flashes.
  useEffect(() => {
    if (!open) return;
    if (company) {
      reset(companyToFormValues(company));
      void trigger();
    } else {
      reset(companyFormDefaults);
    }
  }, [open, company, reset, trigger]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (company) {
        await updateCompany.mutateAsync({ id: company.id, fields: toEditableFields(values) });
      } else {
        await createCompany.mutateAsync(toCreateInput(values));
      }
      onClose();
    } catch {
      // Error toast is handled inside the mutation hook; keep the drawer open.
    }
  });

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit company' : 'Add company'}
      description={isEdit ? 'Update this client’s details.' : 'Create a new client record.'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <ConfirmDeleteButton onConfirm={handleDelete} loading={deleteCompany.isPending} />
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={isSubmitting} disabled={!isValid}>
              {isEdit ? 'Save changes' : 'Add company'}
            </Button>
          </div>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Company name" htmlFor="name" required error={errors.name?.message}>
          <TextInput
            id="name"
            placeholder="Acme Industries"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>

        <FormField label="Contact name" htmlFor="contactName" error={errors.contactName?.message}>
          <TextInput
            id="contactName"
            placeholder="Jane Doe"
            invalid={!!errors.contactName}
            {...register('contactName')}
          />
        </FormField>

        <FormField label="Contact email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
          <TextInput
            id="contactEmail"
            type="email"
            placeholder="jane@acme.com"
            invalid={!!errors.contactEmail}
            {...register('contactEmail')}
          />
        </FormField>

        <FormField label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone?.message}>
          <TextInput
            id="contactPhone"
            type="tel"
            placeholder="+91 98765 43210"
            invalid={!!errors.contactPhone}
            {...register('contactPhone')}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Industry" htmlFor="industry" error={errors.industry?.message}>
            <SelectInput
              id="industry"
              options={INDUSTRY_OPTIONS}
              invalid={!!errors.industry}
              {...register('industry')}
            />
          </FormField>

          <FormField label="Status" htmlFor="status" error={errors.status?.message}>
            <SelectInput
              id="status"
              options={COMPANY_STATUS_OPTIONS}
              invalid={!!errors.status}
              {...register('status')}
            />
          </FormField>
        </div>
      </form>
    </SlideOver>
  );
}
