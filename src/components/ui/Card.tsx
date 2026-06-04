import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Surface container used across list/detail views. */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}
