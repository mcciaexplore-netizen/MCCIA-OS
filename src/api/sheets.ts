/**
 * Local-first data store (no backend).
 *
 * Records live in the browser's `localStorage`, one array per sheet, so whatever
 * you enter in the app persists across reloads and is never erased unless you
 * clear your browser data. This object implements the same
 * `read / append / update / remove` interface the data hooks already use, so the
 * rest of the app is unchanged.
 *
 * Note: `localStorage` holds a few MB. That's ample for text records; very large
 * base64 images attached to creatives are the only realistic way to fill it.
 */

import type { SheetName } from '@/constants';

const STORAGE_PREFIX = 'mccia:data:';

type Row = Record<string, unknown>;

function storageKey(sheet: SheetName): string {
  return `${STORAGE_PREFIX}${sheet}`;
}

function loadAll<T>(sheet: SheetName): T[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(sheet));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveAll(sheet: SheetName, rows: unknown[]): void {
  try {
    window.localStorage.setItem(storageKey(sheet), JSON.stringify(rows));
  } catch (error) {
    // Most likely the storage quota was exceeded (e.g. large attached images).
    const quotaHit =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new Error(
      quotaHit
        ? 'Storage is full — remove some records or large images and try again.'
        : 'Could not save your changes locally.'
    );
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A persistent, browser-local table store. Mirrors the previous network client's
 * surface (id + timestamps are generated here, just as the server used to).
 */
export class LocalDataStore {
  /** All rows of a sheet. */
  async read<T>(sheet: SheetName): Promise<T[]> {
    return loadAll<T>(sheet);
  }

  /** Append a new row; generates `id`, `createdAt`, `updatedAt`. */
  async append<T>(sheet: SheetName, row: Row): Promise<T> {
    const rows = loadAll<Row>(sheet);
    const now = new Date().toISOString();
    const record: Row = { ...row, id: newId(), createdAt: now, updatedAt: now };
    rows.push(record);
    saveAll(sheet, rows);
    return record as T;
  }

  /** Merge `fields` into the row with the given `id` and bump `updatedAt`. */
  async update<T>(sheet: SheetName, id: string, fields: Row): Promise<T> {
    const rows = loadAll<Row>(sheet);
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`No record with id "${id}" in "${sheet}".`);
    const updated: Row = { ...rows[index], ...fields, id, updatedAt: new Date().toISOString() };
    rows[index] = updated;
    saveAll(sheet, rows);
    return updated as T;
  }

  /** Delete the row with the given `id`. */
  async remove(sheet: SheetName, id: string): Promise<{ id: string }> {
    const rows = loadAll<Row>(sheet);
    saveAll(
      sheet,
      rows.filter((r) => r.id !== id)
    );
    return { id };
  }
}

/** Shared singleton used by the data hooks. */
export const sheets = new LocalDataStore();
