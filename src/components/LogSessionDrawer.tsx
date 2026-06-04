import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock } from 'lucide-react';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/Button';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/form/fields';
import { Combobox, type ComboboxOption } from '@/components/form/Combobox';
import { Toggle } from '@/components/form/Toggle';
import { INDUSTRY_LABELS, SESSION_OUTCOME_OPTIONS } from '@/constants';
import { useCompanies } from '@/hooks/useCompanies';
import { useCreateConsultingSession } from '@/hooks/useConsultingSessions';
import { useCreateFollowUp } from '@/hooks/useFollowUps';
import {
  sessionFormDefaults,
  sessionFormSchema,
  toFollowUpInput,
  toSessionInput,
  type SessionFormValues,
} from '@/schemas/session';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import { computeFollowUpDate, FOLLOWUP_INTERVALS } from '@/utils/followup';
import { getFollowUpIntervalPref } from '@/utils/preferences';

const FORM_ID = 'log-session-form';

interface LogSessionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Preselect a company (e.g. when opened from a company detail page). */
  defaultCompanyId?: string;
}

/**
 * Slide-over for logging a consulting session. On submit it creates the
 * session, then (if a follow-up is required) a linked follow-up record.
 */
export function LogSessionDrawer({ open, onClose, defaultCompanyId }: LogSessionDrawerProps) {
  const companies = useCompanies();
  const createSession = useCreateConsultingSession();
  const createFollowUp = useCreateFollowUp();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    mode: 'onChange',
    defaultValues: sessionFormDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...sessionFormDefaults(getFollowUpIntervalPref()),
      companyId: defaultCompanyId ?? '',
    });
  }, [open, defaultCompanyId, reset]);

  const followUpRequired = watch('followUpRequired');
  const followUpInterval = watch('followUpInterval');
  const sessionDate = watch('date');
  const followUpDate = watch('followUpDate');

  // Auto-calculate the follow-up date for preset intervals.
  useEffect(() => {
    if (!followUpRequired || followUpInterval === 'custom') return;
    const days = Number(followUpInterval);
    setValue('followUpDate', computeFollowUpDate(sessionDate || '', days), {
      shouldValidate: true,
    });
  }, [followUpRequired, followUpInterval, sessionDate, setValue]);

  const companyOptions: ComboboxOption[] = (companies.data ?? []).map((company) => ({
    value: company.id,
    label: company.name,
    sublabel: company.industry ? INDUSTRY_LABELS[company.industry] : undefined,
  }));

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await createSession.mutateAsync(toSessionInput(values));
      if (values.followUpRequired) {
        await createFollowUp.mutateAsync(toFollowUpInput(values, session.id));
      }
      onClose();
    } catch {
      // Toasts are surfaced by the mutation hooks; keep the drawer open.
    }
  });

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Log session"
      description="Record a consulting session and optionally schedule a follow-up."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting} disabled={!isValid}>
            Save session
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Company" htmlFor="companyId" required error={errors.companyId?.message}>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Combobox
                id="companyId"
                options={companyOptions}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.companyId}
                placeholder={companies.isPending ? 'Loading companies…' : 'Search companies…'}
                emptyText={companies.isPending ? 'Loading…' : 'No companies found'}
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Session date" htmlFor="date" required error={errors.date?.message}>
            <TextInput id="date" type="date" invalid={!!errors.date} {...register('date')} />
          </FormField>
          <FormField label="Outcome" htmlFor="outcome" error={errors.outcome?.message}>
            <SelectInput
              id="outcome"
              options={SESSION_OUTCOME_OPTIONS}
              invalid={!!errors.outcome}
              {...register('outcome')}
            />
          </FormField>
        </div>

        <FormField label="Topic / agenda" htmlFor="topic" required error={errors.topic?.message}>
          <TextInput
            id="topic"
            placeholder="e.g. Q3 growth strategy review"
            invalid={!!errors.topic}
            {...register('topic')}
          />
        </FormField>

        <FormField
          label="Session notes"
          htmlFor="notes"
          hint="Use new lines / dashes for bullet points."
          error={errors.notes?.message}
        >
          <TextArea
            id="notes"
            rows={5}
            placeholder={'- Discussed …\n- Agreed to …\n- Next steps …'}
            invalid={!!errors.notes}
            {...register('notes')}
          />
        </FormField>

        {/* Follow-up toggle + interval */}
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Follow-up required?
              </p>
              <p className="text-xs text-slate-400">Schedule a reminder to circle back.</p>
            </div>
            <Controller
              control={control}
              name="followUpRequired"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Follow-up required"
                />
              )}
            />
          </div>

          {followUpRequired && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {FOLLOWUP_INTERVALS.map((interval) => (
                  <button
                    key={interval.value}
                    type="button"
                    onClick={() => setValue('followUpInterval', interval.value)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      followUpInterval === interval.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    {interval.label}
                  </button>
                ))}
              </div>

              {followUpInterval === 'custom' ? (
                <FormField
                  label="Follow-up date"
                  htmlFor="followUpDate"
                  error={errors.followUpDate?.message}
                >
                  <TextInput
                    id="followUpDate"
                    type="date"
                    invalid={!!errors.followUpDate}
                    {...register('followUpDate')}
                  />
                </FormField>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                  <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />
                  Follow-up on{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(followUpDate, 'a date')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </SlideOver>
  );
}
