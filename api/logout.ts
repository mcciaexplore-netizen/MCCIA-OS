import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogout } from '../server/authApi.js';

/** POST /api/logout — clear the session cookie. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const result = await handleLogout();
  if (result.setCookie) res.setHeader('set-cookie', result.setCookie);
  res.status(result.status).json(result.body);
}
