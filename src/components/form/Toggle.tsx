import { cn } from '@/utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
}

/** Accessible on/off switch. Controlled via checked/onChange. */
export function Toggle({ checked, onChange, id, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-900',
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
