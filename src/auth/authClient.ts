/**
 * Better Auth browser client. Talks to the same-origin `/api/auth/*` routes;
 * the session cookie rides along automatically on same-origin requests.
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
});
