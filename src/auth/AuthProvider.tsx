import { useCallback, useMemo, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { authClient } from './authClient';
import { toSessionUser } from './users';
import { queryClient } from '@/app/queryClient';

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
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        // Surface the real reason (status helps diagnose prod issues:
        // 401 = bad password, 403 = origin/BETTER_AUTH_URL, 500 = server/DB).
        const detail = error.message || error.statusText || 'request failed';
        return { ok: false, error: error.status ? `${detail} (${error.status})` : detail };
      }
      // Drop any cached data from a previous user so this session starts clean.
      queryClient.clear();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not reach the server' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    queryClient.clear();
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
