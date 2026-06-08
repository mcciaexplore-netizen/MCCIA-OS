import { queryClient } from '@/app/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { sheets } from '@/api/sheets';
import { SHEET_NAMES } from '@/constants';
import type { Company } from '@/types';
import {
  buildCompanyPlan,
  downloadCompanyTemplate,
  gridToCompanies,
  materializeCompanyImport,
  type CompanyRow,
} from '@/utils/companyIO';
import type { ImportKind } from './ImportDrawer';

const s = (n: number) => (n === 1 ? '' : 's');

export const companyImportKind: ImportKind<CompanyRow> = {
  title: 'Import companies',
  description: 'From an Excel file, pasted cells, or a Google Sheets link.',
  recordNoun: 'company',
  parse: (grid) => {
    const p = gridToCompanies(grid);
    const warnings: string[] = [];
    if (p.skippedRows)
      warnings.push(`${p.skippedRows} row${s(p.skippedRows)} skipped (missing company name).`);
    return { rows: p.rows, mappedFields: p.mappedFields, unmappedHeaders: p.unmappedHeaders, warnings };
  },
  previewColumns: [
    { header: 'Company', cell: (r) => r.name },
    { header: 'UDYAM', cell: (r) => r.udyamNumber || '—' },
    { header: 'Contact', cell: (r) => r.contactPhone || r.contactName || '—' },
    { header: 'Email', cell: (r) => r.contactEmail || '—' },
  ],
  downloadTemplate: downloadCompanyTemplate,
  successMessage: ({ records, companies }) => {
    const updated = records - companies;
    const bits = [`${companies} new`];
    if (updated > 0) bits.push(`${updated} updated`);
    return `Imported ${records} compan${records === 1 ? 'y' : 'ies'} (${bits.join(', ')}).`;
  },
  runImport: async (rows) => {
    // Read fresh, merge, then replace the Companies sheet atomically so existing
    // companies (and their ids, referenced by sessions/projects) are preserved.
    const companies = await sheets.read<Company>(SHEET_NAMES.companies);
    const plan = buildCompanyPlan(rows, companies);
    const next = materializeCompanyImport(plan, companies);
    await sheets.overwriteMany([{ sheet: SHEET_NAMES.companies, rows: next }]);
    await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    return { records: plan.total, companies: plan.newCount };
  },
};
