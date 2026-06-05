import { createContext } from 'react';
import type { SessionUser } from './users';

export interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: SessionUser | null;
  /** True while the initial session check is in flight (avoid flashing login). */
  isLoading: boolean;
  /** Sign in with email + password. Resolves with an error message on failure. */
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Sign out and return to the login screen. */
  signOut: () => Promise<void>;
  /** Re-fetch the session (e.g. after a profile/password change). */
  refresh: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
