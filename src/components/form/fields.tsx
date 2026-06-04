/**
 * Presentational form primitives. They are deliberately uncontrolled-friendly:
 * pass `react-hook-form`'s `register(...)` spread directly onto them.
 */

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';
import { CONTROL_BASE, controlBorder } from './control';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label + control + error/hint wrapper. */
export function FormField({ label, htmlFor, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), className)}
      {...props}
    />
  );
});

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  options: { value: string; label: string }[];
};

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { invalid, className, options, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), 'pr-8', className)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), 'resize-y', className)}
      {...props}
    />
  );
});
