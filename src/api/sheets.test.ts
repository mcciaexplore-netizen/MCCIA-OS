// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalDataStore } from './sheets';
import { SHEET_NAMES } from '@/constants';

const COMPANIES = SHEET_NAMES.companies;
const SESSIONS = SHEET_NAMES.consultingSessions;
const keyOf = (sheet: string) => `mccia:data:${sheet}`;

// Minimal in-memory Storage (jsdom + Node 25's experimental localStorage clash;
// a hand-rolled mock keeps the store tests deterministic and dependency-free).
class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
}

function installStorage(): MemoryStorage {
  const mock = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', { value: mock, configurable: true, writable: true });
  return mock;
}

function keysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(prefix)) out.push(k);
  }
  return out;
}

let store: LocalDataStore;

beforeEach(() => {
  installStorage();
  store = new LocalDataStore();
});

describe('CRUD', () => {
  it('append generates id + timestamps and read returns the row', async () => {
    const rec = await store.append<{ id: string; createdAt: string }>(COMPANIES, { name: 'Acme' });
    expect(rec.id).toBeTruthy();
    expect(rec.createdAt).toBeTruthy();
    const all = await store.read<{ name: string }>(COMPANIES);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Acme');
  });

  it('update merges fields and preserves the rest', async () => {
    const rec = await store.append<{ id: string }>(COMPANIES, { name: 'A', status: 'active' });
    const updated = await store.update<{ name: string; status: string }>(COMPANIES, rec.id, { name: 'B' });
    expect(updated.name).toBe('B');
    expect(updated.status).toBe('active');
  });

  it('remove deletes the row', async () => {
    const rec = await store.append<{ id: string }>(COMPANIES, { name: 'A' });
    await store.remove(COMPANIES, rec.id);
    expect(await store.read(COMPANIES)).toHaveLength(0);
  });
});

describe('corruption guard', () => {
  it('backs up an unreadable blob instead of silently dropping it, and never overwrites the backup', async () => {
    window.localStorage.setItem(keyOf(COMPANIES), '{ this is : not json');

    expect(await store.read(COMPANIES)).toEqual([]);
    const backups = keysWithPrefix(`${keyOf(COMPANIES)}:corrupt:`);
    expect(backups).toHaveLength(1);
    expect(window.localStorage.getItem(backups[0])).toBe('{ this is : not json');

    // A later write replaces the main key but the recovery backup survives.
    await store.append(COMPANIES, { name: 'fresh' });
    expect(await store.read<{ name: string }>(COMPANIES)).toHaveLength(1);
    expect(window.localStorage.getItem(backups[0])).toBe('{ this is : not json');
  });

  it('treats a valid-but-non-array blob as corruption', async () => {
    window.localStorage.setItem(keyOf(COMPANIES), '{"not":"an array"}');
    expect(await store.read(COMPANIES)).toEqual([]);
    expect(keysWithPrefix(`${keyOf(COMPANIES)}:corrupt:`).length).toBeGreaterThan(0);
  });
});

describe('overwriteMany (atomic)', () => {
  it('writes multiple sheets at once', async () => {
    await store.overwriteMany([
      { sheet: COMPANIES, rows: [{ id: 'c1', name: 'A' }] },
      { sheet: SESSIONS, rows: [{ id: 's1', companyId: 'c1' }] },
    ]);
    expect(await store.read(COMPANIES)).toHaveLength(1);
    expect(await store.read(SESSIONS)).toHaveLength(1);
  });

  it('rolls every sheet back if any write fails', async () => {
    await store.append(COMPANIES, { name: 'Seed' });
    const before = window.localStorage.getItem(keyOf(COMPANIES));

    // Make the SESSIONS write throw (simulating a quota error on the 2nd key).
    const real = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((k: string, v: string) => {
      if (k === keyOf(SESSIONS)) throw new DOMException('quota', 'QuotaExceededError');
      real(k, v);
    });

    await expect(
      store.overwriteMany([
        { sheet: COMPANIES, rows: [{ id: 'x' }, { id: 'y' }] },
        { sheet: SESSIONS, rows: [{ id: 'z' }] },
      ])
    ).rejects.toBeTruthy();

    // Companies restored to its prior value — not the half-written [x, y].
    expect(window.localStorage.getItem(keyOf(COMPANIES))).toBe(before);
    expect(window.localStorage.getItem(keyOf(SESSIONS))).toBeNull();
  });
});
