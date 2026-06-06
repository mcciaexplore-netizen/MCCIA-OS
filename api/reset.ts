import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePasswordReset } from '../server/api';

/** "Forgot password" reset (recovery-code based). See server/api.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handlePasswordReset({
    method: req.method ?? 'GET',
    query: req.query as Record<string, string | undefined>,
    body: req.body,
    headers: {},
  });
  res.status(result.status).json(result.body);
}
