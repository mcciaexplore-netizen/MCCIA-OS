import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { useAuth } from '@/auth/useAuth';
import { APP_USERS, toSessionUser, type AppUser } from '@/auth/users';
import { verifyPassword } from '@/auth/hash';
import { cn } from '@/utils/cn';

/**
 * Profile-picker sign-in. Scroll to your avatar, click it, enter the password,
 * and you're in. This is a client-side gate (see `src/auth/users.ts`).
 */
// With one profile there's nothing to pick — jump straight to the password.
const SINGLE_USER = APP_USERS.length === 1 ? APP_USERS[0] : null;

export function Login() {
  const { signIn } = useAuth();
  const [selected, setSelected] = useState<AppUser | null>(SINGLE_USER);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus the password box once a profile is chosen.
  useEffect(() => {
    if (selected) passwordRef.current?.focus();
  }, [selected]);

  const pick = (user: AppUser) => {
    setSelected(user);
    setPassword('');
    setError(null);
  };

  const back = () => {
    setSelected(null);
    setPassword('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const ok = await verifyPassword(selected, password);
    if (ok) {
      signIn(toSessionUser(selected));
    } else {
      setError('Incorrect password. Try again.');
      setBusy(false);
      passwordRef.current?.focus();
      passwordRef.current?.select();
    }
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
          {!selected ? (
            <>
              <h2 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
                Who's signing in?
              </h2>
              <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                Scroll to find your profile and tap it.
              </p>

              {/* Scrollable profile row */}
              <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3">
                {APP_USERS.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => pick(user)}
                    className="group flex w-28 shrink-0 snap-center flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-4xl transition-transform group-hover:scale-105 dark:bg-slate-700/60">
                      {user.emoji}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-slate-400">{user.role}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col items-center">
              {!SINGLE_USER && (
                <button
                  type="button"
                  onClick={back}
                  className="mb-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Choose a different profile
                </button>
              )}

              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-5xl dark:bg-slate-700/60">
                {selected.emoji}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {selected.name}
              </h2>
              <p className="text-sm text-slate-400">{selected.role}</p>

              <div className="mt-6 w-full max-w-xs">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    ref={passwordRef}
                    id="password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-invalid={!!error}
                    className={cn(
                      'h-11 w-full rounded-lg border bg-white px-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800 dark:text-slate-100',
                      error
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-600'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <p className="mt-2 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
                )}

                <Button type="submit" className="mt-4 w-full" loading={busy} disabled={!password}>
                  <LogIn className="h-4 w-4" />
                  Unlock
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Protected workspace · sign-in required each session.
        </p>
      </div>
    </div>
  );
}
