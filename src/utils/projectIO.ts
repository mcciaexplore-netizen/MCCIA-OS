/**
 * Import / export of App Development projects as Excel (.xlsx), CSV, or pasted
 * cells. One row = one project for a company (company found-or-created by name).
 * Reuses the generic readers/date parsing from `consultationIO`.
 */

import * as XLSX from 'xlsx';
import type {
  AppProject,
  AppProjectInput,
  Company,
  CompanyInput,
  ProjectStage,
} from '@/types';
import { normalizeHeader, parseImportDate } from './consultationIO';

/* ------------------------------------------------------------------ *
 * Columns
 * ------------------------------------------------------------------ */

export type ProjectField =
  | 'companyName'
  | 'projectName'
  | 'stage'
  | 'progress'
  | 'startDate'
  | 'dueDate'
  | 'repoUrl'
  | 'liveUrl'
  | 'nextAction'
  | 'blocker'
  | 'description';

export const PROJECT_EXPORT_COLUMNS: { field: ProjectField; header: string }[] = [
  { field: 'companyName', header: 'Company Name' },
  { field: 'projectName', header: 'Project Name' },
  { field: 'stage', header: 'Stage' },
  { field: 'progress', header: 'Progress %' },
  { field: 'startDate', header: 'Start Date' },
  { field: 'dueDate', header: 'Due Date' },
  { field: 'repoUrl', header: 'Repo URL' },
  { field: 'liveUrl', header: 'Live URL' },
  { field: 'nextAction', header: 'Next Action' },
  { field: 'blocker', header: 'Blocker' },
  { field: 'description', header: 'Description' },
];

const FIELD_SYNONYMS: Record<ProjectField, string[]> = {
  companyName: ['company name', 'company', 'client', 'organisation', 'organization'],
  projectName: ['project name', 'project', 'app name', 'app', 'product'],
  stage: ['stage', 'status', 'phase'],
  progress: ['progress', 'progress percent', 'percent complete', 'completion', 'percent', 'progress %'],
  startDate: ['start date', 'started', 'start', 'kickoff'],
  dueDate: ['due date', 'target launch date', 'target date', 'launch date', 'deadline', 'eta', 'due'],
  repoUrl: ['repo url', 'repo', 'repository', 'github', 'git'],
  liveUrl: ['live url', 'live', 'url', 'demo', 'deployment', 'site'],
  nextAction: ['next action', 'next step', 'next steps', 'action', 'todo'],
  blocker: ['blocker', 'blockers', 'blocked by', 'risk'],
  description: ['description', 'details', 'summary', 'notes'],
};

const HEADER_TO_FIELD: Record<string, ProjectField> = (() => {
  const map: Record<string, ProjectField> = {};
  (Object.keys(FIELD_SYNONYMS) as ProjectField[]).forEach((field) => {
    FIELD_SYNONYMS[field].forEach((syn) => {
      if (!(syn in map)) map[syn] = field;
    });
  });
  return map;
})();

const STAGE_SYNONYMS: Record<string, ProjectStage> = {
  discovery: 'discovery', planning: 'discovery', scoping: 'discovery', backlog: 'discovery', idea: 'discovery',
  design: 'design', ux: 'design', ui: 'design', wireframe: 'design',
  build: 'build', development: 'build', dev: 'build', building: 'build', coding: 'build', 'in progress': 'build',
  testing: 'testing', qa: 'testing', test: 'testing', review: 'testing',
  delivered: 'delivered', done: 'delivered', launched: 'delivered', complete: 'delivered',
  completed: 'delivered', shipped: 'delivered', live: 'delivered',
};

/* ------------------------------------------------------------------ *
 * Parse
 * ------------------------------------------------------------------ */

export type ProjectRow = Record<ProjectField, string>;

const EMPTY_ROW: ProjectRow = Object.fromEntries(
  PROJECT_EXPORT_COLUMNS.map((c) => [c.field, ''])
) as ProjectRow;

export interface ParsedProjects {
  rows: ProjectRow[];
  mappedFields: ProjectField[];
  unmappedHeaders: string[];
  skippedRows: number;
  unparsedDates: number;
}

export function gridToProjects(grid: string[][]): ParsedProjects {
  if (grid.length === 0) {
    return { rows: [], mappedFields: [], unmappedHeaders: [], skippedRows: 0, unparsedDates: 0 };
  }
  const [headerRow, ...dataRows] = grid;

  const indexToField = new Map<number, ProjectField>();
  const mappedFields: ProjectField[] = [];
  const unmappedHeaders: string[] = [];
  headerRow.forEach((raw, index) => {
    const text = raw.trim();
    if (text === '') return;
    const field = HEADER_TO_FIELD[normalizeHeader(text)];
    if (field && !mappedFields.includes(field)) {
      indexToField.set(index, field);
      mappedFields.push(field);
    } else if (!field) {
      unmappedHeaders.push(text);
    }
  });

  const rows: ProjectRow[] = [];
  let skippedRows = 0;
  let unparsedDates = 0;

  for (const cells of dataRows) {
    const row: ProjectRow = { ...EMPTY_ROW };
    indexToField.forEach((field, index) => {
      row[field] = (cells[index] ?? '').toString().trim();
    });
    // Need at least a company and a project name to make a row meaningful.
    if (row.companyName === '' || row.projectName === '') {
      if (cells.some((c) => (c ?? '').toString().trim() !== '')) skippedRows += 1;
      continue;
    }
    for (const d of [row.startDate, row.dueDate]) {
      if (d !== '' && parseImportDate(d) === null) unparsedDates += 1;
    }
    rows.push(row);
  }

  return { rows, mappedFields, unmappedHeaders, skippedRows, unparsedDates };
}

/* ------------------------------------------------------------------ *
 * Value coercion
 * ------------------------------------------------------------------ */

const nullable = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
};

export function parseStage(raw: string): ProjectStage {
  return STAGE_SYNONYMS[normalizeHeader(raw)] ?? 'discovery';
}

export function parseProgress(raw: string): number | null {
  const m = raw.replace('%', '').trim();
  if (m === '') return null;
  const n = Number(m);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ------------------------------------------------------------------ *
 * Plan + materialise
 * ------------------------------------------------------------------ */

type ProjectDraft = Omit<AppProjectInput, 'companyId'>;

export interface ProjectImportPlan {
  newCompanies: { key: string; input: CompanyInput }[];
  projects: { key: string; input: ProjectDraft }[];
  existingByKey: Map<string, string>;
  companyCount: number;
}

const companyKey = (name: string): string => normalizeHeader(name);

function newCompanyInput(name: string): CompanyInput {
  return {
    name: name.trim(),
    status: 'active',
    industry: null,
    website: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
    udyamNumber: null,
    district: null,
    acquisitionSource: null,
    ramp: null,
    membership: null,
    membershipVerified: null,
  };
}

function rowToProjectDraft(row: ProjectRow): ProjectDraft {
  return {
    name: row.projectName.trim(),
    stage: parseStage(row.stage),
    progressPercent: parseProgress(row.progress),
    repoUrl: nullable(row.repoUrl),
    liveUrl: nullable(row.liveUrl),
    startDate: parseImportDate(row.startDate),
    targetLaunchDate: parseImportDate(row.dueDate),
    description: nullable(row.description),
    nextAction: nullable(row.nextAction),
    blocker: nullable(row.blocker),
  };
}

export function buildProjectPlan(rows: ProjectRow[], existing: Company[]): ProjectImportPlan {
  const existingByKey = new Map<string, string>();
  existing.forEach((c) => {
    const key = companyKey(c.name);
    if (!existingByKey.has(key)) existingByKey.set(key, c.id);
  });

  const newCompanies: ProjectImportPlan['newCompanies'] = [];
  const newKeys = new Set<string>();
  const projects: ProjectImportPlan['projects'] = [];

  for (const row of rows) {
    const key = companyKey(row.companyName);
    if (!existingByKey.has(key) && !newKeys.has(key)) {
      newCompanies.push({ key, input: newCompanyInput(row.companyName) });
      newKeys.add(key);
    }
    projects.push({ key, input: rowToProjectDraft(row) });
  }

  return {
    newCompanies,
    projects,
    existingByKey,
    companyCount: new Set(projects.map((p) => p.key)).size,
  };
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function materializeProjectImport(
  plan: ProjectImportPlan,
  currentCompanies: Company[],
  currentProjects: AppProject[]
): { companies: Company[]; projects: AppProject[] } {
  const now = new Date().toISOString();
  const companies = currentCompanies.slice();
  const keyToId = new Map(plan.existingByKey);

  for (const { key, input } of plan.newCompanies) {
    const id = genId();
    companies.push({ ...input, id, createdAt: now, updatedAt: now });
    keyToId.set(key, id);
  }

  const projects = currentProjects.slice();
  for (const { key, input } of plan.projects) {
    const companyId = keyToId.get(key);
    if (!companyId) continue;
    projects.push({ ...input, companyId, id: genId(), createdAt: now, updatedAt: now });
  }

  return { companies, projects };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

function toExportRecord(company: Company, project: AppProject | null): Record<string, string> {
  const values: Record<ProjectField, string> = {
    companyName: company.name ?? '',
    projectName: project?.name ?? '',
    stage: project?.stage ?? '',
    progress: project?.progressPercent != null ? String(project.progressPercent) : '',
    startDate: project?.startDate ?? '',
    dueDate: project?.targetLaunchDate ?? '',
    repoUrl: project?.repoUrl ?? '',
    liveUrl: project?.liveUrl ?? '',
    nextAction: project?.nextAction ?? '',
    blocker: project?.blocker ?? '',
    description: project?.description ?? '',
  };
  const out: Record<string, string> = {};
  PROJECT_EXPORT_COLUMNS.forEach(({ field, header }) => {
    out[header] = values[field];
  });
  return out;
}

export function buildProjectsWorkbook(companies: Company[], projects: AppProject[]): XLSX.WorkBook {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const records: Record<string, string>[] = [];

  projects
    .slice()
    .sort((a, b) => (b.targetLaunchDate ?? '').localeCompare(a.targetLaunchDate ?? ''))
    .forEach((project) => {
      const company = byId.get(project.companyId);
      if (company) records.push(toExportRecord(company, project));
    });

  const headers = PROJECT_EXPORT_COLUMNS.map((c) => c.header);
  const ws =
    records.length > 0
      ? XLSX.utils.json_to_sheet(records, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  return wb;
}

const pad = (n: number): string => String(n).padStart(2, '0');
function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function exportProjectsToXlsx(companies: Company[], projects: AppProject[]): void {
  XLSX.writeFile(buildProjectsWorkbook(companies, projects), `mccia-projects-${todayStamp()}.xlsx`);
}

export function downloadProjectTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([PROJECT_EXPORT_COLUMNS.map((c) => c.header)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  XLSX.writeFile(wb, 'mccia-projects-template.xlsx');
}
