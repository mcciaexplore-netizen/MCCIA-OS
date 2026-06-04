import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STORAGE_KEYS, type ThemePreference } from '@/constants';
import { ThemeContext, type ThemeContextValue } from './theme-context';

const PREFERENCE_ORDER: ThemePreference[] = ['light', 'dark', 'system'];

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEYS.theme);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/**
 * Provides theme state with light/dark/system support, persists the choice to
 * localStorage, and reacts to OS-level preference changes while in "system"
 * mode. The initial paint is handled by an inline script in index.html to
 * avoid a flash of the wrong theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Track OS preference so "system" mode stays in sync.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    preference === 'system' ? systemTheme : preference;

  // Apply the resolved theme to <html> and persist the preference.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    window.localStorage.setItem(STORAGE_KEYS.theme, next);
  }, []);

  const cycleTheme = useCallback(() => {
    setPreferenceState((current) => {
      const idx = PREFERENCE_ORDER.indexOf(current);
      const next = PREFERENCE_ORDER[(idx + 1) % PREFERENCE_ORDER.length];
      window.localStorage.setItem(STORAGE_KEYS.theme, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference, cycleTheme }),
    [preference, resolvedTheme, setPreference, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
