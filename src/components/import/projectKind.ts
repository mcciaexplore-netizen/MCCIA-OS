import { queryClient } from '@/app/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { sheets } from '@/api/sheets';
import { SHEET_NAMES } from '@/constants';
import type { AppProject, Company } from '@/types';
import {
  buildProjectPlan,
  downloadProjectTemplate,
  gridToProjects,
  materializeProjectImport,
  type ProjectRow,
} from '@/utils/projectIO';
import type { ImportKind } from './ImportDrawer';

const s = (n: number) => (n === 1 ? '' : 's');

export const projectImportKind: ImportKind<ProjectRow> = {
  title: 'Import projects',
  description: 'From an Excel file, pasted cells, or a Google Sheets link.',
  recordNoun: 'project',
  parse: (grid) => {
    const p = gridToProjects(grid);
    const warnings: string[] = [];
    if (p.skippedRows)
      warnings.push(`${p.skippedRows} row${s(p.skippedRows)} skipped (missing company or project name).`);
    if (p.unparsedDates)
      warnings.push(`${p.unparsedDates} date${s(p.unparsedDates)} couldn’t be read and will be left blank.`);
    return { rows: p.rows, mappedFields: p.mappedFields, unmappedHeaders: p.unmappedHeaders, warnings };
  },
  previewColumns: [
    { header: 'Company', cell: (r) => r.companyName },
    { header: 'Project', cell: (r) => r.projectName },
    { header: 'Stage', cell: (r) => r.stage || '—' },
  ],
  downloadTemplate: downloadProjectTemplate,
  runImport: async (rows) => {
    const [companies, projects] = await Promise.all([
      sheets.read<Company>(SHEET_NAMES.companies),
      sheets.read<AppProject>(SHEET_NAMES.appProjects),
    ]);
    const plan = buildProjectPlan(rows, companies);
    const next = materializeProjectImport(plan, companies, projects);
    await sheets.overwriteMany([
      { sheet: SHEET_NAMES.companies, rows: next.companies },
      { sheet: SHEET_NAMES.appProjects, rows: next.projects },
    ]);
    await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.appProjects.all });
    return { records: plan.projects.length, companies: plan.companyCount };
  },
};
