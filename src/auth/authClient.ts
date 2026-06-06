/**
 * Browser auth client for the passwordless login.
 *
 * Thin `fetch` wrappers over the same-origin `/api/login`, `/api/me`,
 * `/api/logout` routes. The session cookie is HttpOnly and rides along
 * automatically on same-origin requests.
 */

/** The user as returned by the auth API. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Sign in with an email. Resolves with the user, or an error message. */
export async function apiLogin(
  email: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
  const data = await readJson(res);
  if (!res.ok) return { ok: false, error: (data.error as string) || `Sign-in failed (${res.status})` };
  return { ok: true, user: data.user as AuthUser };
}

/** The current signed-in user, or null. */
export async function apiMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await readJson(res);
    return (data.user as AuthUser | null) ?? null;
  } catch {
    return null;
  }
}

/** Clear the session. */
export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Best-effort; the client clears its state regardless.
  }
}

/** Update the signed-in user's display name. */
export async function apiUpdateName(
  name: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
  const data = await readJson(res);
  if (!res.ok) return { ok: false, error: (data.error as string) || `Update failed (${res.status})` };
  return { ok: true, user: data.user as AuthUser };
}
