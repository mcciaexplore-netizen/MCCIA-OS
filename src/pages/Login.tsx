import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { useAuth } from '@/auth/useAuth';
import { effectiveUsers, setPasswordHash } from '@/auth/account';
import { toSessionUser, type AppUser } from '@/auth/users';
import { sha256Hex, verifyPassword, verifyRecovery } from '@/auth/hash';
import { cn } from '@/utils/cn';

type Step = 'password' | 'forgot';

/**
 * Profile-picker sign-in. Scroll to your avatar, click it, enter the password —
 * or reset it with your recovery code via "Forgot password". This is a
 * client-side gate (see `src/auth/users.ts`).
 */
export function Login() {
  const { signIn } = useAuth();
  const users = useMemo(() => effectiveUsers(), []);
  const single = users.length === 1 ? users[0] : null;

  const [selected, setSelected] = useState<AppUser | null>(single);
  const [step, setStep] = useState<Step>('password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Password step
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Forgot step
  const [recovery, setRecovery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (selected && step === 'password') passwordRef.current?.focus();
  }, [selected, step]);

  const pick = (user: AppUser) => {
    setSelected(user);
    resetFields();
  };

  const back = () => {
    setSelected(null);
    resetFields();
  };

  function resetFields() {
    setStep('password');
    setPassword('');
    setRecovery('');
    setNewPassword('');
    setConfirm('');
    setError(null);
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    if (await verifyPassword(selected, password)) {
      signIn(toSessionUser(selected));
    } else {
      setError('Incorrect password. Try again.');
      setBusy(false);
      passwordRef.current?.select();
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || busy) return;
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    if (await verifyRecovery(selected, recovery)) {
      setPasswordHash(selected.id, await sha256Hex(newPassword));
      signIn(toSessionUser(selected)); // reset succeeded → sign straight in
    } else {
      setError('That recovery code is not correct.');
      setBusy(false);
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
            <ProfilePicker users={users} onPick={pick} />
          ) : (
            <div className="flex flex-col items-center">
              {(!single || step === 'forgot') && (
                <button
                  type="button"
                  onClick={() => (step === 'forgot' ? resetFields() : back())}
                  className="mb-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {step === 'forgot' ? 'Back to sign in' : 'Choose a different profile'}
                </button>
              )}

              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-5xl dark:bg-slate-700/60">
                {selected.emoji}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {selected.name}
              </h2>
              <p className="text-sm text-slate-400">{selected.role}</p>

              {step === 'password' ? (
                <form onSubmit={submitPassword} className="mt-6 w-full max-w-xs">
                  <PasswordField
                    inputRef={passwordRef}
                    id="password"
                    label="Password"
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      if (error) setError(null);
                    }}
                    show={show}
                    onToggleShow={() => setShow((s) => !s)}
                    invalid={!!error}
                    autoComplete="current-password"
                  />
                  {error && <ErrorText>{error}</ErrorText>}
                  <Button type="submit" className="mt-4 w-full" loading={busy} disabled={!password}>
                    <LogIn className="h-4 w-4" />
                    Unlock
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      resetFields();
                      setStep('forgot');
                    }}
                    className="mt-3 block w-full text-center text-xs font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
                  >
                    Forgot password?
                  </button>
                </form>
              ) : (
                <form onSubmit={submitForgot} className="mt-6 w-full max-w-xs space-y-3">
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Enter your recovery code to set a new password.
                  </div>
                  <PasswordField
                    id="recovery"
                    label="Recovery code"
                    value={recovery}
                    onChange={(v) => {
                      setRecovery(v);
                      if (error) setError(null);
                    }}
                    show={show}
                    onToggleShow={() => setShow((s) => !s)}
                    autoComplete="off"
                  />
                  <PasswordField
                    id="newPassword"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={show}
                    onToggleShow={() => setShow((s) => !s)}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="confirm"
                    label="Confirm new password"
                    value={confirm}
                    onChange={setConfirm}
                    show={show}
                    onToggleShow={() => setShow((s) => !s)}
                    autoComplete="new-password"
                  />
                  {error && <ErrorText>{error}</ErrorText>}
                  <Button
                    type="submit"
                    className="w-full"
                    loading={busy}
                    disabled={!recovery || !newPassword || !confirm}
                  >
                    Reset & sign in
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Protected workspace · sign-in required each session.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProfilePicker({ users, onPick }: { users: AppUser[]; onPick: (u: AppUser) => void }) {
  return (
    <>
      <h2 className="text-center text-base font-semibold text-slate-800 dark:text-slate-100">
        Who's signing in?
      </h2>
      <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
        Scroll to find your profile and tap it.
      </p>
      <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onPick(user)}
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
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  invalid,
  autoComplete,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  invalid?: boolean;
  autoComplete?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          className={cn(
            'h-11 w-full rounded-lg border bg-white px-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800 dark:text-slate-100',
            invalid
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-600'
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? 'Hide' : 'Show'}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-center text-sm text-rose-600 dark:text-rose-400">{children}</p>;
}
