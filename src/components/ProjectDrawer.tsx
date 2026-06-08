import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/Button';
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/form/fields';
import { Combobox, type ComboboxOption } from '@/components/form/Combobox';
import { INDUSTRY_LABELS, PROJECT_STAGE_OPTIONS } from '@/constants';
import { useCompanies } from '@/hooks/useCompanies';
import { useCreateAppProject, useDeleteAppProject, useUpdateAppProject } from '@/hooks/useAppProjects';
import {
  projectFormDefaults,
  projectFormSchema,
  projectToFormValues,
  toCreateInput,
  toEditableFields,
  type ProjectFormValues,
} from '@/schemas/project';
import type { AppProject, ProjectStage } from '@/types';

const FORM_ID = 'project-form';

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the drawer edits this project instead of creating one. */
  project?: AppProject;
  /** Default stage for new projects (e.g. the column an add was triggered from). */
  defaultStage?: ProjectStage;
}

/** Slide-over form for creating or editing an app project. */
export function ProjectDrawer({ open, onClose, project, defaultStage }: ProjectDrawerProps) {
  const isEdit = Boolean(project);
  const companies = useCompanies();
  const createProject = useCreateAppProject();
  const updateProject = useUpdateAppProject();
  const deleteProject = useDeleteAppProject();

  const handleDelete = async () => {
    if (!project) return;
    try {
      await deleteProject.mutateAsync(project.id);
      onClose();
    } catch {
      // Mutation hooks surface the error toast.
    }
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    mode: 'onChange',
    defaultValues: projectFormDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    if (project) {
      reset(projectToFormValues(project));
      void trigger();
    } else {
      reset(projectFormDefaults(defaultStage));
    }
  }, [open, project, defaultStage, reset, trigger]);

  const companyOptions: ComboboxOption[] = (companies.data ?? []).map((company) => ({
    value: company.id,
    label: company.name,
    sublabel: company.industry ? INDUSTRY_LABELS[company.industry] : undefined,
  }));

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, fields: toEditableFields(values) });
      } else {
        await createProject.mutateAsync(toCreateInput(values));
      }
      onClose();
    } catch {
      // Mutation hooks surface the error toast.
    }
  });

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit project' : 'Add project'}
      description={isEdit ? 'Update this project’s details.' : 'Add a new app project to the pipeline.'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <ConfirmDeleteButton onConfirm={handleDelete} loading={deleteProject.isPending} />
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={isSubmitting} disabled={!isValid}>
              {isEdit ? 'Save changes' : 'Add project'}
            </Button>
          </div>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Project name" htmlFor="name" required error={errors.name?.message}>
          <TextInput
            id="name"
            placeholder="e.g. Inventory mobile app"
            invalid={!!errors.name}
            {...register('name')}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Stage" htmlFor="stage" error={errors.stage?.message}>
            <SelectInput
              id="stage"
              options={PROJECT_STAGE_OPTIONS}
              invalid={!!errors.stage}
              {...register('stage')}
            />
          </FormField>
          <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate?.message}>
            <TextInput id="dueDate" type="date" invalid={!!errors.dueDate} {...register('dueDate')} />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <TextArea
            id="description"
            rows={3}
            placeholder="What is this project about?"
            invalid={!!errors.description}
            {...register('description')}
          />
        </FormField>

        <FormField
          label="Next action"
          htmlFor="nextAction"
          hint="What needs to happen next?"
          error={errors.nextAction?.message}
        >
          <TextInput
            id="nextAction"
            placeholder="e.g. Share wireframes for review"
            invalid={!!errors.nextAction}
            {...register('nextAction')}
          />
        </FormField>

        <FormField
          label="Blocker"
          htmlFor="blocker"
          hint="If set, the card shows a warning badge."
          error={errors.blocker?.message}
        >
          <TextInput
            id="blocker"
            placeholder="e.g. Waiting on API access"
            invalid={!!errors.blocker}
            {...register('blocker')}
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
