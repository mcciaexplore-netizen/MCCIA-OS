import { createContext } from 'react';
import type { SessionUser } from './users';

export interface AuthContextValue {
  /** The signed-in profile, or null when locked. */
  user: SessionUser | null;
  /** Mark a profile as signed in (after a verified password). */
  signIn: (user: SessionUser) => void;
  /** Lock the app and return to the login screen. */
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
