/**
 * Password hashing helpers (Web Crypto SHA-256). Available in secure contexts —
 * https in production and http://localhost in dev — which covers this app.
 */

import type { AppUser } from './users';

/** SHA-256 → lowercase hex. */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** True when `password` matches the profile's stored hash. */
export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  if (!password) return false;
  const hash = await sha256Hex(password);
  return hash === user.passwordHash;
}

/** True when `code` matches the profile's stored recovery-code hash. */
export async function verifyRecovery(user: AppUser, code: string): Promise<boolean> {
  if (!code) return false;
  const hash = await sha256Hex(code);
  return hash === user.recoveryHash;
}
