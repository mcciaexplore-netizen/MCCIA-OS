/**
 * Runtime-agnostic handlers for the passwordless auth routes.
 *
 * The same functions back both the Vercel serverless functions (`/api/login`,
 * `/api/me`, `/api/logout`) and the Vite dev middleware, so local dev and the
 * deployed app share identical logic.
 *
 * Login is email-only: if the email exists in the `users` table, we mint a
 * signed session cookie (no password, no OTP, no magic link). This is an
 * internal tool for trusted users — there is intentionally no auth boundary
 * beyond "the email exists".
 */

import { findUserByEmail, getUserById, updateUserName, type DbUser } from './users.js';
import {
  SESSION_COOKIE,
  clearSessionCookie,
  readCookie,
  sessionCookie,
  signToken,
  verifyToken,
} from './session.js';

export interface AuthRequest {
  method: string;
  body: unknown;
  /** Raw `Cookie` header. */
  cookie?: string;
}

export interface AuthResult {
  status: number;
  body: unknown;
  /** A `Set-Cookie` value to send, if any. */
  setCookie?: string;
}

function claims(user: DbUser) {
  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}

function publicUser(user: DbUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function serverError(error: unknown): AuthResult {
  return { status: 500, body: { error: error instanceof Error ? error.message : 'Server error' } };
}

/** POST /api/login — `{ email }` → set session cookie if the email exists. */
export async function handleLogin(req: AuthRequest): Promise<AuthResult> {
  try {
    if (req.method !== 'POST') return { status: 405, body: { error: `Method ${req.method} not allowed` } };

    const email = String(asRecord(req.body).email ?? '').trim();
    if (!email) return { status: 400, body: { error: 'Email is required' } };

    const user = await findUserByEmail(email);
    if (!user) return { status: 401, body: { error: "We couldn't find an account for that email." } };

    return { status: 200, body: { user: publicUser(user) }, setCookie: sessionCookie(signToken(claims(user))) };
  } catch (error) {
    return serverError(error);
  }
}

/** GET /api/me — the current user (re-read from the DB), or `{ user: null }`. */
export async function handleMe(req: AuthRequest): Promise<AuthResult> {
  try {
    const payload = verifyToken(readCookie(req.cookie, SESSION_COOKIE));
    if (!payload) return { status: 200, body: { user: null } };

    const user = await getUserById(payload.sub);
    // The token is valid but the user is gone — clear the stale cookie.
    if (!user) return { status: 200, body: { user: null }, setCookie: clearSessionCookie() };

    return { status: 200, body: { user: publicUser(user) } };
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/logout — clear the session cookie. */
export async function handleLogout(): Promise<AuthResult> {
  try {
    return { status: 200, body: { ok: true }, setCookie: clearSessionCookie() };
  } catch (error) {
    return serverError(error);
  }
}

/** PATCH /api/me — `{ name }` → update the signed-in user's display name. */
export async function handleUpdateProfile(req: AuthRequest): Promise<AuthResult> {
  try {
    const payload = verifyToken(readCookie(req.cookie, SESSION_COOKIE));
    if (!payload) return { status: 401, body: { error: 'Sign in required' } };

    const name = String(asRecord(req.body).name ?? '').trim();
    if (!name) return { status: 400, body: { error: 'Name is required' } };

    const user = await updateUserName(payload.sub, name);
    if (!user) return { status: 404, body: { error: 'User not found' } };

    // Re-issue the cookie so the name embedded in the token stays in sync.
    return { status: 200, body: { user: publicUser(user) }, setCookie: sessionCookie(signToken(claims(user))) };
  } catch (error) {
    return serverError(error);
  }
}

/**
 * Dispatch an auth request by path. Returns null for non-auth paths so callers
 * (the Vite dev middleware) can fall through to the data API.
 */
export async function routeAuth(pathname: string, req: AuthRequest): Promise<AuthResult | null> {
  switch (pathname) {
    case '/api/login':
      return handleLogin(req);
    case '/api/logout':
      return handleLogout();
    case '/api/me':
      return req.method === 'PATCH' ? handleUpdateProfile(req) : handleMe(req);
    default:
      return null;
  }
}
