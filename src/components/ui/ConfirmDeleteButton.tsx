import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmDeleteButtonProps {
  /** Called when the user confirms. */
  onConfirm: () => void;
  loading?: boolean;
  /** Idle-state label (default "Delete"). */
  label?: string;
  /** Confirm-state label (default "Confirm delete"). */
  confirmLabel?: string;
  className?: string;
}

/**
 * Destructive action with an inline two-step confirm — no native dialog. First
 * click reveals Cancel / Confirm; matches the app's inline-confirm style and
 * works in both drawer footers and inline action rows.
 */
export function ConfirmDeleteButton({
  onConfirm,
  loading = false,
  label = 'Delete',
  confirmLabel = 'Confirm delete',
  className,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {loading ? 'Deleting…' : confirmLabel}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20',
        className
      )}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
