import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/Button';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/form/fields';
import { Combobox, type ComboboxOption } from '@/components/form/Combobox';
import { PlatformPicker } from '@/components/social/PlatformPicker';
import { ImageUpload } from '@/components/social/ImageUpload';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { CREATIVE_STATUS_OPTIONS, INDUSTRY_LABELS, SHEET_NAMES } from '@/constants';
import { useCompanies } from '@/hooks/useCompanies';
import {
  CAPTION_MAX,
  creativeFormDefaults,
  creativeFormSchema,
  creativeToFormValues,
  toCreateInput,
  toEditableFields,
  type CreativeFormValues,
} from '@/schemas/creative';
import type { SocialCreative } from '@/types';
import { cn } from '@/utils/cn';

const FORM_ID = 'creative-form';

interface CreativeDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer edits this creative instead of creating one. */
  creative?: SocialCreative;
  defaultCompanyId?: string;
}

/**
 * Slide-over form for a social creative. In create mode multiple platforms can
 * be selected and one record is created per platform; edit mode targets a
 * single record.
 */
export function CreativeDrawer({ open, onClose, creative, defaultCompanyId }: CreativeDrawerProps) {
  const isEdit = Boolean(creative);
  const qc = useQueryClient();
  const companies = useCompanies();

  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isValid },
  } = useForm<CreativeFormValues>({
    resolver: zodResolver(creativeFormSchema),
    mode: 'onChange',
    defaultValues: creativeFormDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    if (creative) {
      reset(creativeToFormValues(creative));
      void trigger();
    } else {
      reset({ ...creativeFormDefaults(), companyId: defaultCompanyId ?? '' });
    }
  }, [open, creative, defaultCompanyId, reset, trigger]);

  const saveMutation = useMutation({
    mutationFn: async (values: CreativeFormValues) => {
      if (creative) {
        await sheets.update<SocialCreative>(
          SHEET_NAMES.socialCreatives,
          creative.id,
          toEditableFields(values, values.platforms[0])
        );
        return { edit: true, count: 1 };
      }
      await Promise.all(
        values.platforms.map((platform) =>
          sheets.append<SocialCreative>(SHEET_NAMES.socialCreatives, toCreateInput(values, platform))
        )
      );
      return { edit: false, count: values.platforms.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.socialCreatives.all });
      toast.success(
        result.edit
          ? 'Creative updated'
          : result.count > 1
            ? `${result.count} creatives added`
            : 'Creative added'
      );
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Could not save creative'),
  });

  const status = watch('status');
  const caption = watch('caption');

  const companyOptions: ComboboxOption[] = (companies.data ?? []).map((company) => ({
    value: company.id,
    label: company.name,
    sublabel: company.industry ? INDUSTRY_LABELS[company.industry] : undefined,
  }));

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit creative' : 'Add creative'}
      description={
        isEdit ? 'Update this creative.' : 'Create a creative for one or more platforms.'
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={saveMutation.isPending} disabled={!isValid}>
            {isEdit ? 'Save changes' : 'Add creative'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Title" htmlFor="title" required error={errors.title?.message}>
          <TextInput
            id="title"
            placeholder="e.g. Diwali offer announcement"
            invalid={!!errors.title}
            {...register('title')}
          />
        </FormField>

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

        <FormField
          label={isEdit ? 'Platform' : 'Platforms'}
          htmlFor="platforms"
          required
          hint={isEdit ? undefined : 'One record is created per selected platform.'}
          error={errors.platforms?.message}
        >
          <Controller
            control={control}
            name="platforms"
            render={({ field }) => (
              <PlatformPicker value={field.value} onChange={field.onChange} multiple={!isEdit} />
            )}
          />
        </FormField>

        <FormField label="Caption / description" htmlFor="caption" error={errors.caption?.message}>
          <TextArea
            id="caption"
            rows={5}
            placeholder="Write the caption…"
            invalid={!!errors.caption}
            {...register('caption')}
          />
          <p
            className={cn(
              'mt-1 text-right text-xs',
              caption.length > CAPTION_MAX ? 'text-rose-500' : 'text-slate-400'
            )}
          >
            {caption.length}/{CAPTION_MAX}
          </p>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Status" htmlFor="status" error={errors.status?.message}>
            <SelectInput
              id="status"
              options={CREATIVE_STATUS_OPTIONS}
              invalid={!!errors.status}
              {...register('status')}
            />
          </FormField>
          {status === 'scheduled' && (
            <FormField
              label="Scheduled date"
              htmlFor="scheduledFor"
              error={errors.scheduledFor?.message}
            >
              <TextInput
                id="scheduledFor"
                type="date"
                invalid={!!errors.scheduledFor}
                {...register('scheduledFor')}
              />
            </FormField>
          )}
        </div>

        <FormField label="Image" htmlFor="image">
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
