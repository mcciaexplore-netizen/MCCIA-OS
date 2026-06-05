import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseDelimitedText } from './consultationIO';
import {
  gridToProjects,
  buildProjectPlan,
  materializeProjectImport,
  buildProjectsWorkbook,
  parseStage,
  parseProgress,
  PROJECT_EXPORT_COLUMNS,
} from './projectIO';
import type { AppProject, Company } from '@/types';

const HEADERS = [
  'Company Name', 'Project Name', 'Stage', 'Progress %', 'Start Date', 'Due Date',
  'Repo URL', 'Live URL', 'Next Action', 'Blocker', 'Description',
];
const ROWS = [
  ['Acme', 'Portal', 'Development', '40', '01/02/2026', '15/06/2026', 'github.com/acme', 'acme.app', 'Wire API', 'Creds', 'Client portal'],
  ['Acme', 'Mobile App', 'qa', '80', '', '', '', '', 'Ship beta', '', 'iOS app'],
  ['Bharat Foods', 'Website', 'done', '100', '', '2026-01-01', '', 'bharatfoods.in', '', '', 'Site'],
  ['', '', '', '', '', '', '', '', '', '', ''], // blank → skipped
];
const TSV = [HEADERS, ...ROWS].map((r) => r.join('\t')).join('\n');

const fullCompany = (over: Partial<Company> & Pick<Company, 'id' | 'name'>): Company => ({
  createdAt: '', updatedAt: '', status: 'active', industry: null, website: null,
  contactName: null, contactEmail: null, contactPhone: null, notes: null,
  udyamNumber: null, district: null, acquisitionSource: null, ramp: null,
  membership: null, membershipVerified: null, ...over,
});

describe('gridToProjects', () => {
  const p = gridToProjects(parseDelimitedText(TSV));
  it('maps all 11 columns', () => {
    expect(p.mappedFields).toHaveLength(11);
    expect(p.unmappedHeaders).toHaveLength(0);
  });
  it('keeps valid rows and skips the blank one', () => {
    expect(p.rows).toHaveLength(3);
    expect(p.skippedRows).toBe(0); // fully-blank row isn't counted as skipped
  });
});

describe('parseStage / parseProgress', () => {
  it('maps stage synonyms (default discovery)', () => {
    expect(parseStage('Development')).toBe('build');
    expect(parseStage('qa')).toBe('testing');
    expect(parseStage('done')).toBe('delivered');
    expect(parseStage('Discovery')).toBe('discovery');
    expect(parseStage('nonsense')).toBe('discovery');
  });
  it('parses and clamps progress', () => {
    expect(parseProgress('40')).toBe(40);
    expect(parseProgress('80%')).toBe(80);
    expect(parseProgress('150')).toBe(100);
    expect(parseProgress('-5')).toBe(0);
    expect(parseProgress('')).toBeNull();
    expect(parseProgress('abc')).toBeNull();
  });
});

describe('plan + materialise', () => {
  const p = gridToProjects(parseDelimitedText(TSV));

  it('dedups companies and counts touched', () => {
    const plan = buildProjectPlan(p.rows, []);
    expect(plan.newCompanies.map((c) => c.input.name)).toEqual(['Acme', 'Bharat Foods']);
    expect(plan.projects).toHaveLength(3);
    expect(plan.companyCount).toBe(2);
  });

  it('materialises linked projects with stage/progress/dates', () => {
    const plan = buildProjectPlan(p.rows, []);
    const { companies, projects } = materializeProjectImport(plan, [], []);
    expect(companies).toHaveLength(2);
    expect(projects).toHaveLength(3);
    const portal = projects.find((pr) => pr.name === 'Portal');
    expect(portal?.stage).toBe('build');
    expect(portal?.progressPercent).toBe(40);
    expect(portal?.targetLaunchDate).toBe('2026-06-15'); // DD/MM/YYYY
    expect(new Set(companies.map((c) => c.id)).has(portal!.companyId)).toBe(true);
  });

  it('reuses an existing company by name', () => {
    const plan = buildProjectPlan(p.rows, [fullCompany({ id: 'c1', name: 'Acme' })]);
    expect(plan.newCompanies.map((c) => c.input.name)).toEqual(['Bharat Foods']);
    expect(plan.companyCount).toBe(2);
  });
});

describe('export', () => {
  it('builds a workbook with the project headers + joined values', () => {
    const companies = [fullCompany({ id: 'c1', name: 'Acme' })];
    const projects: AppProject[] = [{
      id: 'p1', createdAt: '', updatedAt: '', companyId: 'c1', name: 'Portal', stage: 'build',
      progressPercent: 40, repoUrl: 'github.com/acme', liveUrl: 'acme.app', startDate: '2026-02-01',
      targetLaunchDate: '2026-06-15', description: 'Client portal', nextAction: 'Wire API', blocker: 'Creds',
    }];
    const wb = buildProjectsWorkbook(companies, projects);
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).toEqual(PROJECT_EXPORT_COLUMNS.map((c) => c.header));
    expect(rows[0]['Company Name']).toBe('Acme');
    expect(rows[0]['Project Name']).toBe('Portal');
    expect(rows[0]['Stage']).toBe('build');
    expect(String(rows[0]['Progress %'])).toBe('40');
  });
});
