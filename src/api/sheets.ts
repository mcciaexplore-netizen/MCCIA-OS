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

/**
 * Preserve an unreadable blob under a separate key so it is NEVER silently
 * overwritten by the next save — it can be inspected/recovered from devtools.
 */
function backupCorrupt(key: string, raw: string): void {
  try {
    const backupKey = `${key}:corrupt:${Date.now()}`;
    if (!window.localStorage.getItem(backupKey)) {
      window.localStorage.setItem(backupKey, raw);
    }
  } catch {
    /* best effort: if even the backup can't be written, fall through */
  }
}

function loadAll<T>(sheet: SheetName): T[] {
  if (typeof window === 'undefined') return [];
  const key = storageKey(sheet);
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
    // Valid JSON but wrong shape — treat as corruption, don't trust it.
    backupCorrupt(key, raw);
    return [];
  } catch {
    backupCorrupt(key, raw);
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

  /**
   * Atomically replace the full contents of one or more sheets. Snapshots the
   * current values first and rolls every key back if any write fails (e.g. the
   * storage quota is exceeded), so a bulk import is all-or-nothing — it never
   * leaves a half-written batch behind.
   */
  async overwriteMany(updates: { sheet: SheetName; rows: unknown[] }[]): Promise<void> {
    const snapshots = updates.map(({ sheet }) => {
      const key = storageKey(sheet);
      return { key, previous: window.localStorage.getItem(key) };
    });
    try {
      for (const { sheet, rows } of updates) saveAll(sheet, rows);
    } catch (error) {
      for (const { key, previous } of snapshots) {
        if (previous === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, previous);
      }
      throw error;
    }
  }
}

/** Shared singleton used by the data hooks. */
export const sheets = new LocalDataStore();
