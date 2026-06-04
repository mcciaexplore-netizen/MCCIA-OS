import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TONE_CLASSES, type Tone } from '@/utils/status';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** Small status pill. Colour is driven by a semantic `tone`. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
