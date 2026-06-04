/**
 * Platform-agnostic Google Sheets API v4 handler.
 *
 * This is the ONLY place the service-account private key is ever touched, and
 * it runs exclusively server-side (Vite dev middleware locally, a serverless
 * function in production). The browser never sees the key — it POSTs an action
 * envelope to `/api/sheets` and this handler performs the privileged call.
 *
 * Request envelope (POST body):
 *   { action: 'read',   sheet }
 *   { action: 'append', sheet, row }
 *   { action: 'update', sheet, id, fields }
 *   { action: 'remove', sheet, id }
 *
 * Response: { status, body: { ok, data?, error? } }
 */

import { JWT } from 'google-auth-library';
import { randomUUID } from 'node:crypto';

export interface SheetsHandlerConfig {
  /** Base64-encoded service-account JSON. */
  serviceAccountJson: string;
  /** Target spreadsheet id. */
  sheetsId: string;
}

export interface HandlerResult {
  status: number;
  body: { ok: boolean; data?: unknown; error?: string };
}

type Action = 'read' | 'append' | 'update' | 'remove';

interface RequestBody {
  action?: Action;
  sheet?: string;
  row?: Record<string, unknown>;
  id?: string;
  fields?: Record<string, unknown>;
}

type Row = Record<string, string | null>;

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * The spreadsheet this app is linked to. Used when `SHEETS_ID` is not set in the
 * environment, so the backend only needs a service-account key configured. Set
 * the `SHEETS_ID` env var to point at a different spreadsheet.
 */
export const DEFAULT_SHEETS_ID = '13EGF4dsKJDoA5co7jUGvzMxwnaA0W9eXNtBQIGWgpqU';

// Module-scoped caches survive across warm invocations.
let cachedClient: JWT | null = null;
let cachedEmail = '';
const gidCache = new Map<string, number>();

/** Build (or reuse) an authenticated JWT client from the base64 SA JSON. */
function getClient(serviceAccountJson: string): JWT {
  const json = JSON.parse(
    Buffer.from(serviceAccountJson, 'base64').toString('utf8')
  ) as { client_email: string; private_key: string };

  if (cachedClient && cachedEmail === json.client_email) return cachedClient;
  cachedClient = new JWT({ email: json.client_email, key: json.private_key, scopes: SCOPES });
  cachedEmail = json.client_email;
  return cachedClient;
}

/** Retry transient Sheets API failures (429/500/503) with exponential backoff. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status =
        (err as { response?: { status?: number }; code?: number })?.response?.status ??
        (err as { code?: number })?.code;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || i === attempts - 1) break;
      const delay = Math.min(2000, 500 * 2 ** i) + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

/** Convert a 1-based column index to its A1 letter (1 → A, 27 → AA). */
function columnLetter(index: number): string {
  let n = index;
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** Map a raw cell row to an object keyed by header; empty cells become null. */
function rowToObject(headers: string[], cells: string[]): Row {
  const obj: Row = {};
  headers.forEach((header, i) => {
    const value = cells[i] ?? '';
    obj[header] = value === '' ? null : value;
  });
  return obj;
}

/** Serialize a value for a sheet cell. */
function toCell(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

async function fetchValues(
  client: JWT,
  sheetsId: string,
  range: string
): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${sheetsId}/values/${encodeURIComponent(range)}`;
  const res = await withRetry(() =>
    client.request<{ values?: string[][] }>({ url, method: 'GET' })
  );
  return res.data.values ?? [];
}

/** Resolve a tab's numeric sheetId (gid), needed for row deletion. */
async function getSheetGid(client: JWT, sheetsId: string, sheet: string): Promise<number> {
  const key = `${sheetsId}:${sheet}`;
  const cached = gidCache.get(key);
  if (cached !== undefined) return cached;

  const url = `${SHEETS_BASE}/${sheetsId}?fields=sheets.properties(sheetId,title)`;
  const res = await withRetry(() =>
    client.request<{ sheets?: { properties?: { sheetId?: number; title?: string } }[] }>({
      url,
      method: 'GET',
    })
  );
  const match = res.data.sheets?.find((s) => s.properties?.title === sheet);
  if (!match?.properties || match.properties.sheetId === undefined) {
    throw new Error(`Sheet "${sheet}" not found in the spreadsheet.`);
  }
  gidCache.set(key, match.properties.sheetId);
  return match.properties.sheetId;
}

async function readSheet(client: JWT, sheetsId: string, sheet: string): Promise<Row[]> {
  const values = await fetchValues(client, sheetsId, sheet);
  if (values.length === 0) return [];
  const [headers, ...rows] = values;
  return rows
    .filter((cells) => cells.some((c) => c !== ''))
    .map((cells) => rowToObject(headers, cells));
}

async function appendRow(
  client: JWT,
  sheetsId: string,
  sheet: string,
  row: Record<string, unknown>
): Promise<Row> {
  const values = await fetchValues(client, sheetsId, sheet);
  if (values.length === 0) {
    throw new Error(`Sheet "${sheet}" has no header row to append against.`);
  }
  const headers = values[0];
  const now = new Date().toISOString();
  const record: Record<string, unknown> = {
    ...row,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const cells = headers.map((header) => toCell(record[header]));

  const url =
    `${SHEETS_BASE}/${sheetsId}/values/${encodeURIComponent(sheet)}` +
    ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  await withRetry(() => client.request({ url, method: 'POST', data: { values: [cells] } }));

  return rowToObject(headers, cells);
}

async function updateRow(
  client: JWT,
  sheetsId: string,
  sheet: string,
  id: string,
  fields: Record<string, unknown>
): Promise<Row> {
  const values = await fetchValues(client, sheetsId, sheet);
  if (values.length === 0) throw new Error(`Sheet "${sheet}" is empty.`);

  const headers = values[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error(`Sheet "${sheet}" has no "id" column.`);

  // values[k] (k >= 1) is spreadsheet row k+1; header occupies row 1.
  const k = values.findIndex((cells, i) => i > 0 && cells[idIndex] === id);
  if (k === -1) throw new Error(`No row with id "${id}" in "${sheet}".`);

  const existing = rowToObject(headers, values[k]);
  const merged: Record<string, unknown> = {
    ...existing,
    ...fields,
    id,
    updatedAt: new Date().toISOString(),
  };
  const cells = headers.map((header) => toCell(merged[header]));

  const sheetRow = k + 1;
  const range = `${sheet}!A${sheetRow}:${columnLetter(headers.length)}${sheetRow}`;
  const url = `${SHEETS_BASE}/${sheetsId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  await withRetry(() => client.request({ url, method: 'PUT', data: { values: [cells] } }));

  return rowToObject(headers, cells);
}

async function removeRow(
  client: JWT,
  sheetsId: string,
  sheet: string,
  id: string
): Promise<{ id: string }> {
  const values = await fetchValues(client, sheetsId, sheet);
  if (values.length === 0) throw new Error(`Sheet "${sheet}" is empty.`);

  const headers = values[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error(`Sheet "${sheet}" has no "id" column.`);

  const rowIndex = values.findIndex((cells, i) => i > 0 && cells[idIndex] === id);
  if (rowIndex === -1) throw new Error(`No row with id "${id}" in "${sheet}".`);

  const gid = await getSheetGid(client, sheetsId, sheet);
  const url = `${SHEETS_BASE}/${sheetsId}:batchUpdate`;
  await withRetry(() =>
    client.request({
      url,
      method: 'POST',
      data: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gid,
                dimension: 'ROWS',
                startIndex: rowIndex, // 0-based grid index; header is index 0
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    })
  );

  return { id };
}

/** Entry point shared by the dev middleware and the serverless function. */
export async function handleSheetsRequest(
  body: RequestBody,
  config: SheetsHandlerConfig
): Promise<HandlerResult> {
  // The spreadsheet is linked by default; only the secret key must be provided.
  const sheetsId = config.sheetsId || DEFAULT_SHEETS_ID;
  if (!config.serviceAccountJson || !sheetsId) {
    return {
      status: 501,
      body: {
        ok: false,
        error:
          'Sheets backend not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (see .env.example).',
      },
    };
  }

  const { action, sheet } = body;
  if (!action || !sheet) {
    return { status: 400, body: { ok: false, error: 'Missing "action" or "sheet".' } };
  }

  try {
    const client = getClient(config.serviceAccountJson);

    switch (action) {
      case 'read':
        return { status: 200, body: { ok: true, data: await readSheet(client, sheetsId, sheet) } };
      case 'append':
        return {
          status: 200,
          body: { ok: true, data: await appendRow(client, sheetsId, sheet, body.row ?? {}) },
        };
      case 'update':
        if (!body.id) return { status: 400, body: { ok: false, error: 'Missing "id".' } };
        return {
          status: 200,
          body: {
            ok: true,
            data: await updateRow(client, sheetsId, sheet, body.id, body.fields ?? {}),
          },
        };
      case 'remove':
        if (!body.id) return { status: 400, body: { ok: false, error: 'Missing "id".' } };
        return {
          status: 200,
          body: { ok: true, data: await removeRow(client, sheetsId, sheet, body.id) },
        };
      default:
        return { status: 400, body: { ok: false, error: `Unknown action "${action}".` } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected Sheets API error';
    return { status: 502, body: { ok: false, error: message } };
  }
}
