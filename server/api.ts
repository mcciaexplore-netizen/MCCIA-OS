/**
 * Runtime-agnostic request handlers for the data API.
 *
 * The same two functions back both the Vercel serverless functions (`/api/*.ts`)
 * and the Vite dev middleware, so local `npm run dev` and the deployed app talk
 * to Neon through identical logic.
 *
 * Every request must carry a valid Better Auth session (the browser sends the
 * session cookie automatically on same-origin calls). No session → 401.
 */

import {
  appendRow,
  ensureSchemaOnce,
  isSheet,
  overwriteMany,
  readSheet,
  removeRow,
  updateRow,
  type Sheet,
} from './store';
import { getAuth } from './auth';

export interface ApiRequest {
  method: string;
  query: Record<string, string | undefined>;
  body: unknown;
  headers: Record<string, string | undefined>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

function ok(body: unknown): ApiResponse {
  return { status: 200, body };
}

function fail(status: number, error: string): ApiResponse {
  return { status, body: { error } };
}

async function authorized(req: ApiRequest): Promise<boolean> {
  const session = await getAuth().api.getSession({
    headers: new Headers({ cookie: req.headers.cookie ?? '' }),
  });
  return !!session?.session;
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

/** GET / POST / PATCH / DELETE on a single sheet — `/api/records`. */
export async function handleRecords(req: ApiRequest): Promise<ApiResponse> {
  if (!(await authorized(req))) return fail(401, 'Sign in required');

  const sheet = req.query.sheet;
  if (!isSheet(sheet)) return fail(400, `Unknown or missing sheet "${sheet ?? ''}"`);

  try {
    await ensureSchemaOnce();
    switch (req.method) {
      case 'GET':
        return ok(await readSheet(sheet));
      case 'POST':
        return ok(await appendRow(sheet, asRecord(req.body)));
      case 'PATCH': {
        const id = req.query.id;
        if (!id) return fail(400, 'id is required');
        return ok(await updateRow(sheet, id, asRecord(req.body)));
      }
      case 'DELETE': {
        const id = req.query.id;
        if (!id) return fail(400, 'id is required');
        return ok(await removeRow(sheet, id));
      }
      default:
        return fail(405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Server error');
  }
}

/** Atomic multi-sheet replace — `POST /api/bulk` with `{ updates: [...] }`. */
export async function handleBulk(req: ApiRequest): Promise<ApiResponse> {
  if (!(await authorized(req))) return fail(401, 'Sign in required');
  if (req.method !== 'POST') return fail(405, `Method ${req.method} not allowed`);

  const body = asRecord(req.body);
  const updates = body.updates;
  if (!Array.isArray(updates)) return fail(400, 'Body must be { updates: [...] }');

  const cleaned: { sheet: Sheet; rows: Record<string, unknown>[] }[] = [];
  for (const update of updates) {
    const u = asRecord(update);
    if (!isSheet(u.sheet)) return fail(400, `Unknown sheet "${String(u.sheet)}"`);
    if (!Array.isArray(u.rows)) return fail(400, `Sheet "${u.sheet}" is missing rows[]`);
    cleaned.push({ sheet: u.sheet, rows: u.rows.map(asRecord) });
  }

  try {
    await ensureSchemaOnce();
    await overwriteMany(cleaned);
    return ok({ ok: true });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : 'Server error');
  }
}
