import { useCallback, useMemo, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { authClient } from './authClient';
import { toSessionUser } from './users';

/**
 * Auth state backed by Better Auth (session in Neon). `useSession` keeps the
 * signed-in user live; sign-in/out and profile changes update it automatically.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const sessionUser = session.data?.user ?? null;

  const user = useMemo(
    () => (sessionUser ? toSessionUser(sessionUser) : null),
    [sessionUser]
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) return { ok: false, error: error.message || 'Sign in failed' };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const refresh = useCallback(() => {
    void session.refetch();
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading: session.isPending, signIn, signOut, refresh }),
    [user, session.isPending, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
