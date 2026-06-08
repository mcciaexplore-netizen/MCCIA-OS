/**
 * Export of the company master list as Excel (.xlsx).
 *
 * Company IMPORT lives in `components/import/companyKind.ts`, which reuses the
 * richer consultation importer so each row also logs a session. This file only
 * handles the company-list export behind the Companies page "Export" button.
 */

import * as XLSX from 'xlsx';
import type { Company } from '@/types';
import { COMPANY_STATUS_LABELS, INDUSTRY_LABELS } from '@/constants';

const EXPORT_COLUMNS: { header: string; value: (c: Company) => string }[] = [
  { header: 'Company Name', value: (c) => c.name ?? '' },
  { header: 'UDYAM No.', value: (c) => c.udyamNumber ?? '' },
  { header: 'Contact Person', value: (c) => c.contactName ?? '' },
  { header: 'Contact', value: (c) => c.contactPhone ?? '' },
  { header: 'Email Id.', value: (c) => c.contactEmail ?? '' },
  { header: 'Domain', value: (c) => (c.industry ? INDUSTRY_LABELS[c.industry] : '') },
  { header: 'Status', value: (c) => COMPANY_STATUS_LABELS[c.status] ?? '' },
  { header: 'Website', value: (c) => c.website ?? '' },
  { header: 'District', value: (c) => c.district ?? '' },
  { header: 'RAMP', value: (c) => c.ramp ?? '' },
  { header: 'Membership', value: (c) => c.membership ?? '' },
  { header: 'Source', value: (c) => c.acquisitionSource ?? '' },
  { header: 'Notes', value: (c) => c.notes ?? '' },
];

export function buildCompaniesWorkbook(companies: Company[]): XLSX.WorkBook {
  const records = companies
    .slice()
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    .map((c) => {
      const out: Record<string, string> = {};
      EXPORT_COLUMNS.forEach((col) => {
        out[col.header] = col.value(c);
      });
      return out;
    });

  const headers = EXPORT_COLUMNS.map((c) => c.header);
  const ws =
    records.length > 0
      ? XLSX.utils.json_to_sheet(records, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');
  return wb;
}

const pad = (n: number): string => String(n).padStart(2, '0');
function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function exportCompaniesToXlsx(companies: Company[]): void {
  XLSX.writeFile(buildCompaniesWorkbook(companies), `mccia-companies-${todayStamp()}.xlsx`);
}
