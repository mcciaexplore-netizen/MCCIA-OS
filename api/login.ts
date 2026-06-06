import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogin } from '../server/authApi.js';

/** POST /api/login — email-only sign-in. See server/authApi.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handleLogin({
    method: req.method ?? 'GET',
    body: req.body,
    cookie: req.headers.cookie,
  });
  if (result.setCookie) res.setHeader('set-cookie', result.setCookie);
  res.status(result.status).json(result.body);
}
