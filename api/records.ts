import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRecords } from '../server/api.js';

/** GET/POST/PATCH/DELETE a single sheet's records. See server/api.ts. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handleRecords({
    method: req.method ?? 'GET',
    query: req.query as Record<string, string | undefined>,
    body: req.body,
    headers: { cookie: firstHeader(req.headers.cookie) },
  });
  res.status(result.status).json(result.body);
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
