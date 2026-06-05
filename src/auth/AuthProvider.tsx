import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { effectiveUserById } from './account';
import { toSessionUser, type SessionUser } from './users';

/**
 * Per-session auth. The signed-in profile id is kept in `sessionStorage`, so a
 * page reload stays signed in but opening a fresh browser session (or new tab)
 * asks for the password again. Profile details resolve through the override
 * layer (`account.ts`) so name/emoji changes are reflected everywhere.
 */
const SESSION_KEY = 'mccia:auth:user';

function readStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = effectiveUserById(id);
  return user ? toSessionUser(user) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredUser);

  const signIn = useCallback((next: SessionUser) => {
    window.sessionStorage.setItem(SESSION_KEY, next.id);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const reloadUser = useCallback(() => {
    setUser(readStoredUser());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signOut, reloadUser }),
    [user, signIn, signOut, reloadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
