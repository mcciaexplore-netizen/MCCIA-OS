/**
 * Stateless session tokens for the passwordless login.
 *
 * A tiny HS256 JWT signed with the app secret, carried in an HttpOnly cookie.
 * No database, no external library — `node:crypto` HMAC only. The token embeds
 * the user's id (used by the data API to scope every record to its owner) plus
 * a few display fields, and an expiry.
 *
 * Runs server-side only (Vercel functions + the Vite dev middleware); the secret
 * never reaches the browser.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Name of the cookie that carries the session token. */
export const SESSION_COOKIE = 'mccia_session';

/** Session lifetime: 30 days. */
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** What we sign into the token. `sub` is the user id (the data owner). */
export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: string | null;
  /** Expiry, seconds since epoch. */
  exp: number;
}

function secret(): string {
  // Reuse the existing Better Auth secret if AUTH_SECRET isn't set, so the
  // already-configured Vercel env keeps working without a redeploy of secrets.
  const value = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not set — provide a long random string to sign sessions.');
  return value;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

/** Mint a signed token for a user. */
export function signToken(claims: Omit<SessionPayload, 'exp'>, maxAgeSec = MAX_AGE_SEC): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const body = Buffer.from(JSON.stringify({ ...claims, exp } satisfies SessionPayload)).toString('base64url');
  const data = `${header}.${body}`;
  return `${data}.${sign(data)}`;
}

/** Verify a token's signature + expiry; return its payload, or null if invalid. */
export function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expected = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function secureFlag(): string {
  // Browsers drop `Secure` cookies on http://localhost, so only set it in prod.
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

/** A `Set-Cookie` value that stores the session token. */
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secureFlag()}`;
}

/** A `Set-Cookie` value that clears the session. */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

/** Read a single cookie value out of a `Cookie` header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}
