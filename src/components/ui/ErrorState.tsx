import { AlertTriangle, RefreshCw } from 'lucide-react';
import { NotConfiguredError } from '@/api/errors';
import { Button } from './Button';

interface ErrorStateProps {
  error: unknown;
  /** Re-run the failed query/action. */
  onRetry?: () => void;
  className?: string;
}

function messageFor(error: unknown): { title: string; description: string } {
  if (error instanceof NotConfiguredError) {
    return {
      title: 'Backend not connected',
      description:
        'Add your Google Sheets credentials to a .env.local file (see .env.example) to start loading data.',
    };
  }
  if (error instanceof Error) {
    return { title: 'Something went wrong', description: error.message };
  }
  return { title: 'Something went wrong', description: 'An unexpected error occurred.' };
}

/** Inline error panel with an optional retry button. */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { title, description } = messageFor(error);
  return (
    <div
      className={
        'flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 px-6 py-12 text-center dark:border-rose-900/50 dark:bg-rose-950/30 ' +
        (className ?? '')
      }
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
