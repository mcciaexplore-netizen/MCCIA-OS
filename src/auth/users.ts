/**
 * Display roster for the login screen and avatars.
 *
 * Authentication itself lives in Supabase (the `users` table) — this file
 * only maps each account's email to a friendly name, emoji, and role for the UI,
 * since the database has no emoji field. Keep the emails in sync with the rows in
 * the database (see the four seed users).
 */

/** The signed-in user as the app consumes it (DB user + cosmetics). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  /** Avatar emoji (cosmetic, from the roster below). */
  emoji: string;
  /** Role / subtitle shown under the name (cosmetic, from the roster below). */
  role: string;
}

/** A login-screen profile: which account it is + how to show it. */
export interface Profile {
  name: string;
  email: string;
  emoji: string;
  role: string;
}

export const PROFILES: Profile[] = [
  { name: 'Sujal', email: 'sujal@mcciapune.com', emoji: '😎', role: 'MCCIA Pune' },
  { name: 'Pratik', email: 'pratik@mcciapune.com', emoji: '🧑‍💻', role: 'MCCIA Pune' },
  { name: 'Intern 1', email: 'intern1@mcciapune.com', emoji: '🌟', role: 'Intern' },
  { name: 'Intern 2', email: 'intern2@mcciapune.com', emoji: '🚀', role: 'Intern' },
];

const DEFAULT_EMOJI = '👤';
const DEFAULT_ROLE = 'Member';

/** The display profile for an email, if it's one of the known accounts. */
export function profileFor(email: string | null | undefined): Profile | undefined {
  if (!email) return undefined;
  const lower = email.toLowerCase();
  return PROFILES.find((p) => p.email.toLowerCase() === lower);
}

/** Map a database user to the app's SessionUser, layering on the cosmetics. */
export function toSessionUser(user: {
  id: string;
  name?: string | null;
  email: string;
}): SessionUser {
  const profile = profileFor(user.email);
  return {
    id: user.id,
    email: user.email,
    name: user.name || profile?.name || user.email,
    emoji: profile?.emoji ?? DEFAULT_EMOJI,
    role: profile?.role ?? DEFAULT_ROLE,
  };
}
