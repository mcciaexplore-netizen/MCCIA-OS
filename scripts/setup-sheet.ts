/**
 * One-time setup / validation for the linked Google Sheet.
 *
 * For every tab the app expects (see `server/sheet-schema.ts`) this script:
 *   • creates the tab if it's missing;
 *   • writes the header row if the tab is empty;
 *   • reports a mismatch if a header row exists but differs (use --force to fix).
 *
 * Run it after sharing the spreadsheet with your service account:
 *   npm run setup:sheet            # create missing tabs + headers, validate rest
 *   npm run setup:sheet -- --force # also overwrite mismatched header rows
 *
 * Credentials are read from the environment (or `.env.local` / `.env`):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  (base64 service-account key)  — required
 *   SHEETS_ID                     (optional; defaults to the linked sheet)
 */

import { existsSync, readFileSync } from 'node:fs';
import { JWT } from 'google-auth-library';
import { SHEET_HEADERS } from '../server/sheet-schema';
import { DEFAULT_SHEETS_ID } from '../server/sheets-handler';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/** Load KEY=VALUE pairs from a dotenv file into process.env (without overriding). */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
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

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function decodeServiceAccount(b64: string): ServiceAccount {
  try {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as ServiceAccount;
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON is not valid base64-encoded JSON. Re-encode the key:\n' +
        '  base64 -i service-account.json | tr -d "\\n"'
    );
  }
}

/** Fetch the set of existing tab titles, with friendly errors for 403/404. */
async function listExistingTabs(
  client: JWT,
  sheetsId: string,
  accountEmail: string
): Promise<Set<string>> {
  try {
    const res = await client.request<{
      sheets?: { properties?: { sheetId?: number; title?: string } }[];
    }>({
      url: `${SHEETS_BASE}/${sheetsId}?fields=sheets.properties(sheetId,title)`,
      method: 'GET',
    });
    return new Set(
      (res.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]
    );
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      throw new Error(
        `Permission denied (403). Share the spreadsheet with ${accountEmail} as an Editor.`
      );
    }
    if (status === 404) {
      throw new Error(`Spreadsheet ${sheetsId} not found (404). Check the SHEETS_ID.`);
    }
    throw error;
  }
}

async function writeHeaders(
  client: JWT,
  sheetsId: string,
  tab: string,
  headers: string[]
): Promise<void> {
  const range = `${tab}!A1:${columnLetter(headers.length)}1`;
  await client.request({
    url: `${SHEETS_BASE}/${sheetsId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    method: 'PUT',
    data: { values: [headers] },
  });
}

async function main(): Promise<void> {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!b64) {
    console.error(
      '✗ GOOGLE_SERVICE_ACCOUNT_JSON is not set.\n' +
        '  Add it to .env.local (see .env.example) or export it, then re-run.'
    );
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  const sheetsId = process.env.SHEETS_ID || DEFAULT_SHEETS_ID;
  const account = decodeServiceAccount(b64);
  const client = new JWT({ email: account.client_email, key: account.private_key, scopes: SCOPES });

  console.log(`• Spreadsheet : https://docs.google.com/spreadsheets/d/${sheetsId}/edit`);
  console.log(`• Service acct: ${account.client_email}\n`);

  // 1. List existing tabs.
  const existing = await listExistingTabs(client, sheetsId, account.client_email);

  // 2. Create any missing tabs in one batch.
  const tabs = Object.keys(SHEET_HEADERS);
  const missingTabs = tabs.filter((tab) => !existing.has(tab));
  if (missingTabs.length > 0) {
    await client.request({
      url: `${SHEETS_BASE}/${sheetsId}:batchUpdate`,
      method: 'POST',
      data: { requests: missingTabs.map((title) => ({ addSheet: { properties: { title } } })) },
    });
    for (const tab of missingTabs) console.log(`＋ created tab "${tab}"`);
  }

  // 3. Ensure each tab has the correct header row.
  let mismatches = 0;
  for (const [tab, headers] of Object.entries(SHEET_HEADERS)) {
    const res = await client.request<{ values?: string[][] }>({
      url: `${SHEETS_BASE}/${sheetsId}/values/${encodeURIComponent(`${tab}!1:1`)}`,
      method: 'GET',
    });
    const current = res.data.values?.[0] ?? [];

    if (current.length === 0) {
      await writeHeaders(client, sheetsId, tab, headers);
      console.log(`＋ wrote headers for "${tab}"`);
    } else if (arraysEqual(current, headers)) {
      console.log(`✓ "${tab}" headers OK`);
    } else if (force) {
      await writeHeaders(client, sheetsId, tab, headers);
      console.log(`↻ overwrote headers for "${tab}" (--force)`);
    } else {
      mismatches += 1;
      const missingCols = headers.filter((h) => !current.includes(h));
      console.warn(
        `⚠ "${tab}" header mismatch.` +
          (missingCols.length ? ` Missing: ${missingCols.join(', ')}.` : '') +
          ' Re-run with --force to overwrite the header row.'
      );
    }
  }

  console.log(
    mismatches > 0
      ? `\nDone with ${mismatches} mismatch(es). Re-run with --force to fix them.`
      : '\n✓ Sheet is ready.'
  );
  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
