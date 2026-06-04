import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        to={ROUTES.dashboard}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
