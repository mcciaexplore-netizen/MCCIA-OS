import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseDelimitedText } from './consultationIO';
import {
  gridToCompanies,
  buildCompanyPlan,
  materializeCompanyImport,
  buildCompaniesWorkbook,
  parseIndustry,
  parseStatus,
} from './companyIO';
import type { Company } from '@/types';

// The exact headers from the master sheet.
const HEADERS = ['Company Name', 'UDYAM No.', 'Contact', 'Email Id.', 'Domain', 'Mode of Consultation'];
const ROWS = [
  ['Acme Industries', 'UDYAM-MH-01-0001', '9876543210', 'info@acme.com', 'Manufacturing', 'Online'],
  ['Bharat Foods', 'UDYAM-MH-02-0002', '9123456780', 'hello@bharat.in', 'Agriculture', 'Offline'],
  ['Sunrise Hotels', '', '9999900000', 'book@sunrise.com', 'Hospitality', 'Telephonic'], // unknown domain
  ['Acme Industries', '', '', 'sales@acme.com', '', ''], // duplicate → merges (last non-empty wins)
  ['', 'UDYAM-X', '', 'orphan@x.com', '', ''], // has data but no name → skipped
];
const TSV = [HEADERS, ...ROWS].map((r) => r.join('\t')).join('\n');

const fullCompany = (over: Partial<Company> & Pick<Company, 'id' | 'name'>): Company => ({
  createdAt: '', updatedAt: '', status: 'active', industry: null, website: null,
  contactName: null, contactEmail: null, contactPhone: null, notes: null,
  udyamNumber: null, district: null, acquisitionSource: null, ramp: null,
  membership: null, membershipVerified: null, ...over,
});

describe('gridToCompanies', () => {
  const parsed = gridToCompanies(parseDelimitedText(TSV));

  it('maps all six master-sheet columns', () => {
    expect(parsed.mappedFields).toEqual(
      expect.arrayContaining(['name', 'udyamNumber', 'contactPhone', 'contactEmail', 'domain', 'mode'])
    );
    expect(parsed.unmappedHeaders).toHaveLength(0);
  });

  it('keeps data rows and skips the blank one', () => {
    expect(parsed.rows).toHaveLength(4); // 2 Acme + Bharat + Sunrise
    expect(parsed.skippedRows).toBe(1);
  });
});

describe('parseIndustry / parseStatus', () => {
  it('maps known domains to a sector, unknown to null', () => {
    expect(parseIndustry('Manufacturing')).toBe('manufacturing');
    expect(parseIndustry('IT')).toBe('technology');
    expect(parseIndustry('Hospitality')).toBeNull();
    expect(parseIndustry('')).toBeNull();
  });
  it('parses status synonyms', () => {
    expect(parseStatus('On Hold')).toBe('on_hold');
    expect(parseStatus('done')).toBe('completed');
    expect(parseStatus('whatever')).toBeNull();
  });
});

describe('buildCompanyPlan — all new', () => {
  const plan = buildCompanyPlan(gridToCompanies(parseDelimitedText(TSV)).rows, []);

  it('dedupes by name (Acme appears twice → one company)', () => {
    expect(plan.newCount).toBe(3);
    expect(plan.updatedCount).toBe(0);
    expect(plan.total).toBe(3);
  });

  it('maps fields and merges duplicates (last non-empty wins; blanks preserved)', () => {
    const acme = plan.newCompanies.find((c) => c.name === 'Acme Industries')!;
    expect(acme.udyamNumber).toBe('UDYAM-MH-01-0001');
    expect(acme.contactPhone).toBe('9876543210'); // 2nd row blank → kept from 1st
    expect(acme.contactEmail).toBe('sales@acme.com'); // 2nd row overrides
    expect(acme.industry).toBe('manufacturing');
    expect(acme.status).toBe('active');
    expect(acme.notes).toBe('Mode of consultation: Online');
  });

  it('keeps an unknown Domain (and Mode) in notes so nothing is lost', () => {
    const sunrise = plan.newCompanies.find((c) => c.name === 'Sunrise Hotels')!;
    expect(sunrise.industry).toBeNull();
    expect(sunrise.notes).toContain('Mode of consultation: Telephonic');
    expect(sunrise.notes).toContain('Domain: Hospitality');
  });
});

describe('buildCompanyPlan — enrich existing', () => {
  const existing = [fullCompany({ id: 'c1', name: 'Bharat Foods', contactName: 'Old Contact' })];
  const plan = buildCompanyPlan(gridToCompanies(parseDelimitedText(TSV)).rows, existing);

  it('updates the matching company instead of duplicating it', () => {
    expect(plan.updatedCount).toBe(1);
    expect(plan.newCount).toBe(2);
    const update = plan.updates[0];
    expect(update.id).toBe('c1');
    expect(update.merged.contactName).toBe('Old Contact'); // not in import → preserved
    expect(update.merged.contactPhone).toBe('9123456780'); // enriched from import
    expect(update.merged.industry).toBe('agriculture');
  });

  it('materialises to existing (enriched) + new, preserving ids', () => {
    const next = materializeCompanyImport(plan, existing);
    expect(next).toHaveLength(3); // 1 existing (updated) + 2 new
    const bharat = next.find((c) => c.id === 'c1')!;
    expect(bharat.name).toBe('Bharat Foods');
    expect(bharat.contactPhone).toBe('9123456780');
    expect(next.filter((c) => c.id !== 'c1').every((c) => c.id && c.createdAt)).toBe(true);
  });
});

describe('export round-trip', () => {
  it('writes the master-sheet headers and reads back the values', () => {
    const next = materializeCompanyImport(buildCompanyPlan(gridToCompanies(parseDelimitedText(TSV)).rows, []), []);
    const wb = buildCompaniesWorkbook(next);
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
    expect(Object.keys(json[0])).toEqual(
      expect.arrayContaining(['Company Name', 'UDYAM No.', 'Contact', 'Email Id.', 'Domain'])
    );
    const acme = json.find((r) => r['Company Name'] === 'Acme Industries')!;
    expect(acme['Domain']).toBe('Manufacturing'); // industry label round-trips
    expect(acme['Email Id.']).toBe('sales@acme.com');
  });
});
