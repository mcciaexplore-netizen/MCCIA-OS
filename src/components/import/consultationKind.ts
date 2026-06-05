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

export const consultationImportKind: ImportKind<ConsultationRow> = {
  title: 'Import consultations',
  description: 'From an Excel file, pasted cells, or a Google Sheets link.',
  recordNoun: 'consultation',
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
    { header: 'Date', cell: (r) => r.date || '—' },
    { header: 'Query', cell: (r) => r.meetingQuery || '—' },
  ],
  downloadTemplate: downloadImportTemplate,
  runImport: async (rows) => {
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
