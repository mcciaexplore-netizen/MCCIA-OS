import { describe, it, expect, afterEach, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseDelimitedText,
  gridToConsultations,
  buildImportPlan,
  materializeImport,
  parseImportDate,
  readWorkbookGrid,
  fetchGoogleSheetCsv,
  buildConsultationsWorkbook,
  EXPORT_COLUMNS,
} from './consultationIO';
import type { Company, ConsultingSession } from '@/types';

// The source sheet's EXACT headers, including the typos "Acuisiton From" / "Meeting Querry".
const HEADERS = [
  'Company Name', 'UDYAM No.', 'Person Name', 'Contact', 'Email Id.', 'Payment',
  'Domain', 'Mode of Consultation', 'Date', 'Time Slot', 'Consultation Status',
  'HOD/ Consultant Assigned', 'RAMP or Non-RAMP', 'Member / Non member',
  'Member/Non Member Verified Version', 'Acuisiton From', 'District',
  'Meeting Querry', 'Meeting Solution',
];

const ROWS = [
  ['Acme Pvt Ltd', 'UDYAM-MH-12-0001', 'R. Sharma', '9876543210', 'r@acme.in', 'Paid',
   'Finance', 'Offline', '05/03/2026', '11:00', 'Completed', 'Dr. Patil', 'RAMP',
   'Member', 'Verified', 'Website', 'Pune', 'GST filing help', 'Walked through portal'],
  ['Acme Pvt Ltd', 'UDYAM-MH-12-0001', 'R. Sharma', '9876543210', 'r@acme.in', 'Pending',
   'Legal', 'Online', '2026-04-12', '15:00', 'Follow up', 'Adv. Joshi', 'RAMP',
   'Member', 'Verified', 'Website', 'Pune', 'MSME dispute', 'Shared draft'],
  ['Bharat Foods', '', 'S. Kale', '9000000000', 'not-an-email', '', 'Marketing',
   'Telephonic', 'bad-date', '10:00', 'Escalated', 'Ms. Rao', 'Non-RAMP',
   'Non Member', '', 'Referral', 'Satara', 'Branding query', 'Suggested agency'],
];

const TSV = [HEADERS, ...ROWS].map((r) => r.join('\t')).join('\n');

const emptyCompany = (over: Partial<Company> & Pick<Company, 'id' | 'name'>): Company => ({
  createdAt: '', updatedAt: '', status: 'active', industry: null, website: null,
  contactName: null, contactEmail: null, contactPhone: null, notes: null,
  udyamNumber: null, district: null, acquisitionSource: null, ramp: null,
  membership: null, membershipVerified: null, ...over,
});

describe('parseDelimitedText', () => {
  it('parses TSV into a grid', () => {
    const grid = parseDelimitedText(TSV);
    expect(grid).toHaveLength(4); // header + 3
    expect(grid[0]).toHaveLength(19);
  });

  it('handles quoted CSV fields with embedded commas and newlines', () => {
    const csv = 'Company Name,Meeting Solution\n"Acme, Inc.","line1\nline2"';
    const grid = parseDelimitedText(csv);
    expect(grid).toHaveLength(2);
    expect(grid[1][0]).toBe('Acme, Inc.');
    expect(grid[1][1]).toBe('line1\nline2');
  });
});

describe('gridToConsultations', () => {
  const parsed = gridToConsultations(parseDelimitedText(TSV));

  it('maps all 19 columns including the typo headers', () => {
    expect(parsed.mappedFields).toHaveLength(19);
    expect(parsed.unmappedHeaders).toHaveLength(0);
    expect(parsed.rows[0].acquisition).toBe('Website'); // "Acuisiton From"
    expect(parsed.rows[0].meetingQuery).toBe('GST filing help'); // "Meeting Querry"
  });

  it('disambiguates membership vs verified-version', () => {
    expect(parsed.rows[0].membership).toBe('Member');
    expect(parsed.rows[0].membershipVerified).toBe('Verified');
  });

  it('flags unparseable dates and invalid emails without dropping rows', () => {
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.unparsedDates).toBe(1); // "bad-date"
    expect(parsed.invalidEmails).toBe(1); // "not-an-email"
  });
});

describe('parseImportDate', () => {
  it('parses day-first and ISO, repairs MM/DD slips, rejects garbage', () => {
    expect(parseImportDate('05/03/2026')).toBe('2026-03-05');
    expect(parseImportDate('2026-04-12')).toBe('2026-04-12');
    expect(parseImportDate('13 Feb 2026')).toBe('2026-02-13');
    expect(parseImportDate('13/02/2026')).toBe('2026-02-13'); // month>12 → swap
    expect(parseImportDate('')).toBeNull();
    expect(parseImportDate('whenever')).toBeNull();
  });
});

describe('buildImportPlan', () => {
  const parsed = gridToConsultations(parseDelimitedText(TSV));

  it('dedups companies by name and counts touched companies correctly', () => {
    const plan = buildImportPlan(parsed.rows, []);
    expect(plan.newCompanies).toHaveLength(2); // Acme once, Bharat once
    expect(plan.sessions).toHaveLength(3);
    expect(plan.companyCount).toBe(2);
  });

  it('counts an existing, already-complete company that only gains a session', () => {
    const existing = [
      emptyCompany({
        id: 'c1', name: 'Acme Pvt Ltd', contactName: 'R. Sharma', contactEmail: 'r@acme.in',
        contactPhone: '9876543210', udyamNumber: 'X', district: 'Pune', acquisitionSource: 'Website',
        ramp: 'RAMP', membership: 'Member', membershipVerified: 'Verified',
      }),
    ];
    const plan = buildImportPlan(parsed.rows, existing);
    expect(plan.newCompanies.map((c) => c.input.name)).toEqual(['Bharat Foods']);
    expect(plan.companyPatches).toHaveLength(0); // nothing to enrich
    expect(plan.companyCount).toBe(2); // Acme (existing) + Bharat — the old bug returned 1
  });

  it('enriches only blank fields of an existing company', () => {
    const existing = [emptyCompany({ id: 'c1', name: 'Acme Pvt Ltd' })];
    const plan = buildImportPlan(parsed.rows, existing);
    const patch = plan.companyPatches.find((p) => p.id === 'c1');
    expect(patch?.fields.udyamNumber).toBe('UDYAM-MH-12-0001');
    expect(patch?.fields.district).toBe('Pune');
  });
});

describe('materializeImport (atomic)', () => {
  it('produces full next arrays with new companies + linked sessions', () => {
    const parsed = gridToConsultations(parseDelimitedText(TSV));
    const plan = buildImportPlan(parsed.rows, []);
    const { companies, sessions } = materializeImport(plan, [], []);

    expect(companies).toHaveLength(2);
    expect(sessions).toHaveLength(3);
    // Every session points at a real company id, and ids/timestamps exist.
    const ids = new Set(companies.map((c) => c.id));
    for (const s of sessions) {
      expect(ids.has(s.companyId)).toBe(true);
      expect(s.id).toBeTruthy();
      expect(s.createdAt).toBeTruthy();
    }
    // Field mapping: title ← Meeting Query, summary ← Meeting Solution, outcome derived.
    const acme = sessions.find((s) => s.title === 'GST filing help');
    expect(acme?.summary).toBe('Walked through portal');
    expect(acme?.outcome).toBe('positive');
    expect(acme?.consultant).toBe('Dr. Patil');
  });

  it('appends to existing data rather than replacing it', () => {
    const parsed = gridToConsultations(parseDelimitedText(TSV));
    const existing = [emptyCompany({ id: 'old', name: 'Old Co' })];
    const oldSession = { id: 's0', createdAt: '', updatedAt: '', companyId: 'old' } as ConsultingSession;
    const plan = buildImportPlan(parsed.rows, existing);
    const { companies, sessions } = materializeImport(plan, existing, [oldSession]);
    expect(companies.some((c) => c.id === 'old')).toBe(true);
    expect(sessions.some((s) => s.id === 's0')).toBe(true);
    expect(sessions).toHaveLength(4);
  });
});

describe('xlsx round-trip', () => {
  it('reads a real .xlsx written by SheetJS', () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultations');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const parsed = gridToConsultations(readWorkbookGrid(buf));
    expect(parsed.mappedFields).toHaveLength(19);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0].companyName).toBe('Acme Pvt Ltd');
  });

  it('exports companies+sessions into a workbook with the 19 headers and joined values', () => {
    const companies = [emptyCompany({ id: 'c1', name: 'Acme', udyamNumber: 'U1' })];
    const sessions = [{
      id: 's1', createdAt: '', updatedAt: '', companyId: 'c1', title: 'GST query', date: '2026-01-01',
      durationMinutes: null, outcome: null, summary: 'Solved', actionItems: null, notes: null,
      consultant: 'Dr. P', mode: 'Online', timeSlot: '11:00', payment: 'Paid', domain: 'Finance',
      consultationStatus: 'Completed',
    } satisfies ConsultingSession];

    const wb = buildConsultationsWorkbook(companies, sessions);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

    expect(EXPORT_COLUMNS).toHaveLength(19);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).toEqual(EXPORT_COLUMNS.map((c) => c.header));
    expect(rows[0]['Company Name']).toBe('Acme');
    expect(rows[0]['UDYAM No.']).toBe('U1'); // company-level
    expect(rows[0]['Meeting Query']).toBe('GST query'); // session title
    expect(rows[0]['Meeting Solution']).toBe('Solved'); // session summary
    expect(rows[0]['Payment']).toBe('Paid'); // session-level
  });
});

describe('fetchGoogleSheetCsv', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a non-Sheets URL', async () => {
    await expect(fetchGoogleSheetCsv('https://example.com')).rejects.toThrow(/Google Sheets/i);
  });

  it('rejects a private sheet that returns an HTML sign-in page', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => '<!doctype html><html>Sign in</html>',
    }));
    await expect(
      fetchGoogleSheetCsv('https://docs.google.com/spreadsheets/d/ABC123/edit')
    ).rejects.toThrow(/publicly viewable/i);
  });

  it('returns CSV text for a public sheet', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      headers: { get: () => 'text/csv' },
      text: async () => 'Company Name,Date\nAcme,2026-01-01',
    }));
    const csv = await fetchGoogleSheetCsv('https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0');
    expect(csv).toContain('Acme');
  });
});
