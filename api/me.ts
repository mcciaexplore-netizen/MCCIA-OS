import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMe, handleUpdateProfile } from '../server/authApi.js';

/** GET /api/me — current user; PATCH /api/me — update display name. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const args = { method: req.method ?? 'GET', body: req.body, cookie: req.headers.cookie };
  const result = req.method === 'PATCH' ? await handleUpdateProfile(args) : await handleMe(args);
  if (result.setCookie) res.setHeader('set-cookie', result.setCookie);
  res.status(result.status).json(result.body);
}
