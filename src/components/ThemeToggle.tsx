import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

const ICON: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const NEXT_LABEL: Record<ThemePreference, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};

/** Cycles light → dark → system. Shows the icon of the current preference. */
export function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();
  const Icon = ICON[preference];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={NEXT_LABEL[preference]}
      aria-label={NEXT_LABEL[preference]}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
