import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { apiLogin, apiLogout, apiMe, apiUpdateName } from './authClient';
import { toSessionUser } from './users';
import { queryClient } from '@/app/queryClient';

/**
 * Auth state for the passwordless login. The session lives in an HttpOnly cookie
 * (a signed JWT); we hydrate it once on mount via `/api/me`, then keep it in
 * React state across sign-in / sign-out / profile updates.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReturnType<typeof toSessionUser> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiMe().then((u) => {
      if (!active) return;
      setUser(u ? toSessionUser(u) : null);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    const result = await apiLogin(email);
    if (!result.ok) return { ok: false, error: result.error };
    // Drop any cached data from a previous user so this session starts clean.
    queryClient.clear();
    setUser(toSessionUser(result.user));
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    queryClient.clear();
    setUser(null);
  }, []);

  const updateName = useCallback(async (name: string) => {
    const result = await apiUpdateName(name);
    if (!result.ok) return { ok: false, error: result.error };
    setUser(toSessionUser(result.user));
    return { ok: true };
  }, []);

  const refresh = useCallback(async () => {
    const u = await apiMe();
    setUser(u ? toSessionUser(u) : null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, signIn, signOut, updateName, refresh }),
    [user, isLoading, signIn, signOut, updateName, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
