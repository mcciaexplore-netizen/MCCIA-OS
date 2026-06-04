/**
 * Login roster for the app's profile-picker sign-in.
 *
 * ⚠️ This is a CLIENT-SIDE gate, not real authentication. The app has no
 * backend, so the password check runs in the browser and the hashes below ship
 * in the bundle. It keeps casual users out; it is not a defence against someone
 * technical. For real security you would need a server.
 *
 * Passwords are stored as SHA-256 hashes (never plaintext). To change a password
 * or add a profile, generate a new hash:
 *
 *     npx tsx scripts/hash-password.ts "your-new-password"
 *
 * …and paste the result into `passwordHash` below. The default password for
 * every seeded profile is `mccia2026` — change it before real use.
 */

/** A profile shown on the login screen (with its secret hash). */
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
}

/** Public view of the signed-in user (no secret). */
export type SessionUser = Omit<AppUser, 'passwordHash'>;

// SHA-256 of "mccia2026" — the shared default. Replace per-profile before use.
const DEFAULT_HASH = '1c1549e818b3e37eee062904de95c65db4f9e2e06d6fad3dbefbb426478f53d6';

/**
 * The people who can sign in. Add more entries here to bring back the
 * profile-picker; with a single entry the login goes straight to the password.
 */
export const APP_USERS: AppUser[] = [
  { id: 'sujal', name: 'Sujal', emoji: '😎', role: 'MCCIA Pune', passwordHash: DEFAULT_HASH },
];

/** Strip the secret before handing a user to the rest of the app. */
export function toSessionUser(user: AppUser): SessionUser {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

/** Look up a profile by id (used to restore a saved session). */
export function findUserById(id: string): AppUser | undefined {
  return APP_USERS.find((u) => u.id === id);
}
