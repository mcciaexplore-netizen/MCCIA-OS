/**
 * Remote data store (Supabase/Postgres via the `/api` backend).
 *
 * Records live in a Supabase database, scoped per signed-in user (owner_id), so
 * each user's data is durable and follows them across devices. This talks to
 * same-origin serverless functions (`/api/records`, `/api/bulk`) — the database
 * credentials stay on the server and never reach the browser.
 *
 * The surface (`read / append / update / remove / overwriteMany`) is unchanged
 * from the previous local store, so the data hooks are untouched. `id` and
 * timestamps are generated server-side.
 */

import type { SheetName } from '@/constants';

type Row = Record<string, unknown>;

/**
 * Shared secret sent with every request. It ships in the client bundle, so it is
 * a basic gate (same tier as the login), not a real authorization boundary.
 */
const API_KEY = import.meta.env.VITE_APP_API_KEY as string | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(API_KEY ? { 'x-app-key': API_KEY } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the server — check your connection and try again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new Error(message);
  }

  // 204/empty bodies (none expected today) parse to undefined.
  return (await res.json().catch(() => undefined)) as T;
}

function recordsUrl(sheet: SheetName, id?: string): string {
  const params = new URLSearchParams({ sheet });
  if (id !== undefined) params.set('id', id);
  return `/api/records?${params.toString()}`;
}

/** A durable, server-backed table store. Mirrors the previous client's surface. */
export class RemoteDataStore {
  /** All rows of a sheet. */
  async read<T>(sheet: SheetName): Promise<T[]> {
    return request<T[]>(recordsUrl(sheet));
  }

  /** Append a new row; the server generates `id`, `createdAt`, `updatedAt`. */
  async append<T>(sheet: SheetName, row: Row): Promise<T> {
    return request<T>(recordsUrl(sheet), { method: 'POST', body: JSON.stringify(row) });
  }

  /** Merge `fields` into the row with the given `id` and bump `updatedAt`. */
  async update<T>(sheet: SheetName, id: string, fields: Row): Promise<T> {
    return request<T>(recordsUrl(sheet, id), { method: 'PATCH', body: JSON.stringify(fields) });
  }

  /** Delete the row with the given `id`. */
  async remove(sheet: SheetName, id: string): Promise<{ id: string }> {
    return request<{ id: string }>(recordsUrl(sheet, id), { method: 'DELETE' });
  }

  /**
   * Atomically replace the full contents of one or more sheets — used by bulk
   * import so the whole batch lands together or not at all.
   */
  async overwriteMany(updates: { sheet: SheetName; rows: unknown[] }[]): Promise<void> {
    await request('/api/bulk', { method: 'POST', body: JSON.stringify({ updates }) });
  }
}

/** Shared singleton used by the data hooks. */
export const sheets = new RemoteDataStore();
