/** Shared Tailwind classes for form controls, used by inputs and the combobox. */

export const CONTROL_BASE =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100';

export const controlBorder = (invalid?: boolean): string =>
  invalid
    ? 'border-rose-400 focus:ring-rose-500'
    : 'border-slate-300 focus:ring-brand-500 dark:border-slate-700';
