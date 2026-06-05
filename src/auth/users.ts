/**
 * Default login roster (the seed). Live values can be changed at runtime in
 * Settings → Account; those overrides are layered on top of this seed by
 * `src/auth/account.ts` and persisted in localStorage.
 *
 * ⚠️ This is a CLIENT-SIDE gate, not real authentication. The app has no
 * backend, so the password check runs in the browser and the hashes below ship
 * in the bundle. It keeps casual users out; it is not a defence against someone
 * technical. For real security you would need a server.
 *
 * Passwords/recovery codes are stored as SHA-256 hashes (never plaintext). To
 * change a seed value, generate a new hash:
 *
 *     npx tsx scripts/hash-password.ts "your-new-password"
 *
 * Defaults: password `mccia26`, recovery code `mccia-recovery-2026`.
 */

/** A profile shown on the login screen (with its secret hashes). */
export interface AppUser {
  id: string;
  /** Display name on the profile card. */
  name: string;
  /** Avatar emoji. */
  emoji: string;
  /** Role / subtitle shown under the name. */
  role: string;
  /** SHA-256 hex of the profile's password. */
  passwordHash: string;
  /** SHA-256 hex of the profile's recovery code (used by "Forgot password"). */
  recoveryHash: string;
}

/** Public view of the signed-in user (no secrets). */
export type SessionUser = Omit<AppUser, 'passwordHash' | 'recoveryHash'>;

// SHA-256 of "mccia26" / "mccia-recovery-2026" — the shared defaults.
const DEFAULT_PASSWORD_HASH = '1ad6be2ee26346ca6748ae49755dd9ff4c9cf850aa87bf82693a7cc889c7bc85';
const DEFAULT_RECOVERY_HASH = 'c41176a8fcd37d1487a9a0bfd01135b3ff9532a7f41302a7207a68dbddf0dd93';

/**
 * The people who can sign in. Add more entries here to extend the profile
 * picker; a single entry skips it and goes straight to the password.
 */
export const APP_USERS: AppUser[] = [
  {
    id: 'sujal',
    name: 'Sujal',
    emoji: '😎',
    role: 'MCCIA Pune',
    passwordHash: DEFAULT_PASSWORD_HASH,
    recoveryHash: DEFAULT_RECOVERY_HASH,
  },
  {
    id: 'pratik',
    name: 'Pratik',
    emoji: '🧑‍💻',
    role: 'MCCIA Pune',
    passwordHash: DEFAULT_PASSWORD_HASH,
    recoveryHash: DEFAULT_RECOVERY_HASH,
  },
  {
    id: 'intern1',
    name: 'Intern 1',
    emoji: '🌟',
    role: 'Intern',
    passwordHash: DEFAULT_PASSWORD_HASH,
    recoveryHash: DEFAULT_RECOVERY_HASH,
  },
  {
    id: 'intern2',
    name: 'Intern 2',
    emoji: '🚀',
    role: 'Intern',
    passwordHash: DEFAULT_PASSWORD_HASH,
    recoveryHash: DEFAULT_RECOVERY_HASH,
  },
];

/** Strip the secrets before handing a user to the rest of the app. */
export function toSessionUser(user: AppUser): SessionUser {
  const { passwordHash: _pw, recoveryHash: _rc, ...rest } = user;
  void _pw;
  void _rc;
  return rest;
}

/** Look up a seed profile by id. */
export function findUserById(id: string): AppUser | undefined {
  return APP_USERS.find((u) => u.id === id);
}
