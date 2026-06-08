import { queryClient } from '@/app/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { sheets } from '@/api/sheets';
import { SHEET_NAMES } from '@/constants';
import type { Company, ConsultingSession } from '@/types';
import {
  buildImportPlan,
  downloadImportTemplate,
  gridToConsultations,
  materializeImport,
  type ConsultationRow,
} from '@/utils/consultationIO';
import type { ImportKind } from './ImportDrawer';

const s = (n: number) => (n === 1 ? '' : 's');

/**
 * Companies bulk import. Each row adds (or enriches) a company AND logs a
 * consultation session, so the master sheet — Company Name, UDYAM No., Person
 * Name, Contact, Email Id., Domain, Mode of Consultation, Date, Time Slot,
 * Consultation Status, … — imports in one go. Reuses the consultation importer.
 */
export const companyImportKind: ImportKind<ConsultationRow> = {
  title: 'Import companies',
  description: 'Each row adds a company and logs a consultation session — Excel, pasted cells, or a Sheets link.',
  recordNoun: 'company',
  parse: (grid) => {
    const p = gridToConsultations(grid);
    const warnings: string[] = [];
    if (p.skippedRows) warnings.push(`${p.skippedRows} row${s(p.skippedRows)} skipped (no company name).`);
    if (p.unparsedDates)
      warnings.push(`${p.unparsedDates} date${s(p.unparsedDates)} couldn’t be read and will be left blank.`);
    if (p.invalidEmails)
      warnings.push(`${p.invalidEmails} row${s(p.invalidEmails)} have an unrecognised email format (kept as-is).`);
    return { rows: p.rows, mappedFields: p.mappedFields, unmappedHeaders: p.unmappedHeaders, warnings };
  },
  previewColumns: [
    { header: 'Company', cell: (r) => r.companyName },
    { header: 'Person', cell: (r) => r.personName || '—' },
    { header: 'Contact', cell: (r) => r.contact || r.email || '—' },
    { header: 'Date', cell: (r) => r.date || '—' },
  ],
  downloadTemplate: downloadImportTemplate,
  successMessage: ({ records, companies }) =>
    `Imported ${companies} compan${companies === 1 ? 'y' : 'ies'} and ${records} session${s(records)}.`,
  runImport: async (rows) => {
    // Read fresh, merge, then replace both sheets atomically so existing
    // companies (and their ids, referenced by sessions) are preserved.
    const [companies, sessions] = await Promise.all([
      sheets.read<Company>(SHEET_NAMES.companies),
      sheets.read<ConsultingSession>(SHEET_NAMES.consultingSessions),
    ]);
    const plan = buildImportPlan(rows, companies);
    const next = materializeImport(plan, companies, sessions);
    await sheets.overwriteMany([
      { sheet: SHEET_NAMES.companies, rows: next.companies },
      { sheet: SHEET_NAMES.consultingSessions, rows: next.sessions },
    ]);
    await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.consultingSessions.all });
    return { records: plan.sessions.length, companies: plan.companyCount };
  },
};
