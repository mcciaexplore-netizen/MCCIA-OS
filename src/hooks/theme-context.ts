import { createContext } from 'react';
import type { ThemePreference } from '@/constants';

export interface ThemeContextValue {
  /** The user's stored preference. */
  preference: ThemePreference;
  /** The theme actually applied right now (resolves "system"). */
  resolvedTheme: 'light' | 'dark';
  /** Update the stored preference. */
  setPreference: (preference: ThemePreference) => void;
  /** Cycle light → dark → system. */
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
