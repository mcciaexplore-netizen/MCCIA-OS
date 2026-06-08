import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildCompaniesWorkbook } from './companyIO';
import type { Company } from '@/types';

const company = (over: Partial<Company> & Pick<Company, 'id' | 'name'>): Company => ({
  createdAt: '', updatedAt: '', status: 'active', industry: null, website: null,
  contactName: null, contactEmail: null, contactPhone: null, notes: null,
  udyamNumber: null, district: null, acquisitionSource: null, ramp: null,
  membership: null, membershipVerified: null, ...over,
});

describe('exportCompaniesToXlsx (workbook)', () => {
  const wb = buildCompaniesWorkbook([
    company({
      id: 'c1',
      name: 'Acme Industries',
      udyamNumber: 'UDYAM-MH-01-0001',
      contactName: 'Jane',
      contactPhone: '9876543210',
      contactEmail: 'sales@acme.com',
      industry: 'manufacturing',
    }),
  ]);
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);

  it('writes the master-sheet headers', () => {
    expect(Object.keys(json[0])).toEqual(
      expect.arrayContaining(['Company Name', 'UDYAM No.', 'Contact', 'Email Id.', 'Domain', 'Status'])
    );
  });

  it('maps fields and renders the industry label under Domain', () => {
    const row = json[0];
    expect(row['Company Name']).toBe('Acme Industries');
    expect(row['UDYAM No.']).toBe('UDYAM-MH-01-0001');
    expect(row['Contact']).toBe('9876543210');
    expect(row['Email Id.']).toBe('sales@acme.com');
    expect(row['Domain']).toBe('Manufacturing');
  });
});
