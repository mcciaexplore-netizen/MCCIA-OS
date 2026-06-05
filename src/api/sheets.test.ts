import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RemoteDataStore } from './sheets';
import { SHEET_NAMES } from '@/constants';

const COMPANIES = SHEET_NAMES.companies;
const SESSIONS = SHEET_NAMES.consultingSessions;

/** A `fetch` stub that records calls and returns a canned JSON response. */
function mockFetch(body: unknown, init?: { status?: number }) {
  const fn = vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

let store: RemoteDataStore;

beforeEach(() => {
  store = new RemoteDataStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request shape', () => {
  it('read → GET /api/records with the sheet', async () => {
    const fetchMock = mockFetch([{ id: 'c1', name: 'Acme' }]);
    const rows = await store.read<{ name: string }>(COMPANIES);

    expect(rows).toEqual([{ id: 'c1', name: 'Acme' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/records?sheet=Companies');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('append → POST with the row as JSON body', async () => {
    const fetchMock = mockFetch({ id: 'new', name: 'Acme' });
    const created = await store.append(COMPANIES, { name: 'Acme' });

    expect(created).toEqual({ id: 'new', name: 'Acme' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/records?sheet=Companies');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Acme' });
  });

  it('update → PATCH with sheet + id and the patch body', async () => {
    const fetchMock = mockFetch({ id: 'c1', name: 'B' });
    await store.update(COMPANIES, 'c1', { name: 'B' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/records?sheet=Companies&id=c1');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'B' });
  });

  it('remove → DELETE with sheet + id', async () => {
    const fetchMock = mockFetch({ id: 'c1' });
    await store.remove(COMPANIES, 'c1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/records?sheet=Companies&id=c1');
    expect(init?.method).toBe('DELETE');
  });

  it('overwriteMany → POST /api/bulk with all updates', async () => {
    const fetchMock = mockFetch({ ok: true });
    await store.overwriteMany([
      { sheet: COMPANIES, rows: [{ id: 'c1' }] },
      { sheet: SESSIONS, rows: [{ id: 's1' }] },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/bulk');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      updates: [
        { sheet: 'Companies', rows: [{ id: 'c1' }] },
        { sheet: 'ConsultingSessions', rows: [{ id: 's1' }] },
      ],
    });
  });

  it('encodes ids that contain URL-special characters', async () => {
    const fetchMock = mockFetch({ id: 'a b&c' });
    await store.remove(COMPANIES, 'a b&c');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/records?sheet=Companies&id=a+b%26c');
  });
});

describe('error handling', () => {
  it('surfaces the server error message on a non-2xx response', async () => {
    mockFetch({ error: 'No record with id "x" in "Companies".' }, { status: 404 });
    await expect(store.update(COMPANIES, 'x', { name: 'B' })).rejects.toThrow(
      'No record with id "x" in "Companies".'
    );
  });

  it('gives a friendly message when the network is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    await expect(store.read(COMPANIES)).rejects.toThrow(/Could not reach the server/);
  });
});
