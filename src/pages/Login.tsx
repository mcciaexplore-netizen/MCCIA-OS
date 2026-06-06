import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { useAuth } from '@/auth/useAuth';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Email-only sign-in. Enter your email; if it matches an account in the database
 * you're signed straight in (no password, no OTP, no magic link).
 *
 * NOTE: this is an internal tool for trusted users — there is intentionally no
 * auth boundary beyond "the email exists". Each account still maps to its own
 * private data via the session.
 */
export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Enter your email to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    const { ok, error: message } = await signIn(value);
    if (!ok) {
      setError(message ?? 'Could not sign in. Try again.');
      setBusy(false);
    }
    // On success, the session updates and <App> swaps in the workspace.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
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

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:p-8"
        >
          <h2 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
            Sign in
          </h2>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Enter your email to continue.
          </p>

          <div className="mt-6 flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="you@mcciapune.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-default disabled:opacity-70"
          >
            {busy ? <Spinner /> : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Trusted users only — sign in with your work email.
        </p>
      </div>
    </div>
  );
}
