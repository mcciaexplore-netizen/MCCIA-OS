import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAuthNode } from '../../server/authNode';

/** Better Auth routes: /api/auth/*. See server/auth.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleAuthNode(req, res);
}
