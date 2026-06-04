import { cn } from '@/utils/cn';

/**
 * Base skeleton block with a shimmer sweep. Compose these into list/card
 * skeletons for loading states.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-slate-200/70 dark:bg-slate-700/50',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent',
        'dark:after:via-white/10',
        className
      )}
      aria-hidden
    />
  );
}

/** A skeleton shaped like one of the app's list rows / cards. */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

/** A grid of card skeletons for list views. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A row of stat-card skeletons for the dashboard. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
