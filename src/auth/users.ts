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
 * Defaults: password `mccia2026`, recovery code `mccia-recovery-2026`.
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

// SHA-256 of "mccia2026" / "mccia-recovery-2026" — the shared defaults.
const DEFAULT_PASSWORD_HASH = '1c1549e818b3e37eee062904de95c65db4f9e2e06d6fad3dbefbb426478f53d6';
const DEFAULT_RECOVERY_HASH = 'c41176a8fcd37d1487a9a0bfd01135b3ff9532a7f41302a7207a68dbddf0dd93';

/**
 * The people who can sign in. Add more entries here to bring back the
 * profile-picker; with a single entry the login goes straight to the password.
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
