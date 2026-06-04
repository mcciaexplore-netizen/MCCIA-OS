/**
 * Serverless entry point (Vercel-style) for the Sheets proxy.
 *
 * Holds the service-account key in server-only env vars — it is NEVER exposed
 * to the browser. Deploy this alongside the static build; the client calls it
 * at `/api/sheets`. For other platforms (Netlify, Cloudflare), wrap
 * `handleSheetsRequest` in that platform's handler signature instead.
 *
 * Note: this file lives outside `src/` and is intentionally not part of the
 * Vite/TS app build — it is bundled by the hosting platform.
 */

import { handleSheetsRequest } from '../server/sheets-handler';

interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    const result = await handleSheetsRequest(body, {
      serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '',
      sheetsId: process.env.SHEETS_ID ?? '',
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Server error',
    });
  }
}
