import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { useAuth } from '@/auth/useAuth';
import { PROFILES, type Profile } from '@/auth/users';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Profile-picker sign-in — no password. Tapping a profile signs straight in as
 * that user (each profile still maps to its own account + private data).
 *
 * NOTE: authentication is intentionally off here — anyone can pick any profile.
 * A shared password establishes the session under the hood; it is not a secret.
 */
const QUICK_LOGIN_PASSWORD = 'mccia2026';

export function Login() {
  const { signIn } = useAuth();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (profile: Profile) => {
    if (busyEmail) return;
    setBusyEmail(profile.email);
    setError(null);
    const { ok, error: message } = await signIn(profile.email, QUICK_LOGIN_PASSWORD);
    if (!ok) {
      setError(message ?? 'Could not sign in. Try again.');
      setBusyEmail(null);
    }
    // On success, the session updates and <App> swaps in the workspace.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-xl">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
          <h2 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
            Who's signing in?
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Tap your profile to continue.
          </p>

          <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3">
            {PROFILES.map((profile) => {
              const busy = busyEmail === profile.email;
              return (
                <button
                  key={profile.email}
                  type="button"
                  onClick={() => pick(profile)}
                  disabled={!!busyEmail}
                  aria-busy={busy}
                  className="group flex w-28 shrink-0 snap-center flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500 dark:disabled:hover:border-slate-700"
                >
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-4xl transition-transform group-hover:scale-105 dark:bg-slate-700/60">
                    {busy ? <Spinner /> : profile.emoji}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {profile.name}
                  </span>
                  <span className="truncate text-xs text-slate-400">{profile.role}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Pick a profile to enter the workspace.</p>
      </div>
    </div>
  );
}
