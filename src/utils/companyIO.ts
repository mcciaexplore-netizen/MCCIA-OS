/**
 * Import / export of Companies as Excel (.xlsx), CSV, or pasted cells.
 *
 * One row = one company, matched-or-created by name. Recognises the columns from
 * the master sheet — Company Name, UDYAM No., Contact, Email Id., Domain, Mode of
 * Consultation — plus the rest of the company fields, via header synonyms.
 *
 * "Domain" maps to the industry sector (best-effort); "Mode of Consultation" has
 * no dedicated company field, so it's preserved in the company's notes (along
 * with any Domain text that didn't match a known sector) — nothing is lost.
 *
 * Re-importing a company name ENRICHES the existing record: any non-empty cell
 * overwrites that field, blank cells leave the existing value untouched.
 *
 * Reuses the generic readers/normalisation from `consultationIO`.
 */

import * as XLSX from 'xlsx';
import type { Company, CompanyInput, CompanyStatus, Industry } from '@/types';
import { COMPANY_STATUS_LABELS, INDUSTRY_LABELS } from '@/constants';
import { normalizeHeader } from './consultationIO';

/* ------------------------------------------------------------------ *
 * Columns
 * ------------------------------------------------------------------ */

/** A recognised import column. Some (domain, mode) are derived, not 1:1 fields. */
export type CompanyField =
  | 'name'
  | 'udyamNumber'
  | 'contactName'
  | 'contactPhone'
  | 'contactEmail'
  | 'domain'
  | 'mode'
  | 'status'
  | 'website'
  | 'district'
  | 'ramp'
  | 'membership'
  | 'source'
  | 'notes';

const FIELD_SYNONYMS: Record<CompanyField, string[]> = {
  name: ['company name', 'company', 'client', 'organisation', 'organization', 'firm', 'business', 'name'],
  udyamNumber: ['udyam no', 'udyam', 'udyam number', 'udyam registration', 'udyam reg', 'udyam registration number', 'msme', 'msme no'],
  contactName: ['contact person', 'contact name', 'person', 'poc', 'owner', 'concerned person', 'contact person name'],
  contactPhone: ['contact', 'phone', 'mobile', 'contact no', 'contact number', 'phone no', 'phone number', 'mobile no', 'mobile number', 'whatsapp', 'cell'],
  contactEmail: ['email id', 'email', 'e mail', 'mail', 'email address', 'emailid', 'mail id'],
  domain: ['domain', 'industry', 'sector', 'field', 'business domain', 'category', 'vertical'],
  mode: ['mode of consultation', 'mode', 'consultation mode', 'consultation', 'mode of consult'],
  status: ['status', 'company status'],
  website: ['website', 'web', 'url', 'site', 'web site'],
  district: ['district', 'location', 'city', 'area', 'place', 'region'],
  ramp: ['ramp', 'ramp status', 'ramp non ramp'],
  membership: ['membership', 'member', 'mccia membership', 'member status'],
  source: ['source', 'acquisition source', 'lead source', 'acquired from', 'reference'],
  notes: ['notes', 'remarks', 'remark', 'comments', 'comment', 'description', 'details'],
};

const HEADER_TO_FIELD: Record<string, CompanyField> = (() => {
  const map: Record<string, CompanyField> = {};
  (Object.keys(FIELD_SYNONYMS) as CompanyField[]).forEach((field) => {
    FIELD_SYNONYMS[field].forEach((syn) => {
      if (!(syn in map)) map[syn] = field;
    });
  });
  return map;
})();

const INDUSTRY_SYNONYMS: Record<string, Industry> = {
  manufacturing: 'manufacturing', manufacture: 'manufacturing', factory: 'manufacturing', production: 'manufacturing', engineering: 'manufacturing', fabrication: 'manufacturing', industrial: 'manufacturing',
  retail: 'retail', retailer: 'retail', shop: 'retail', store: 'retail', ecommerce: 'retail', 'e commerce': 'retail', fmcg: 'retail', trading: 'retail', textile: 'retail',
  agriculture: 'agriculture', agri: 'agriculture', farming: 'agriculture', agro: 'agriculture', 'food processing': 'agriculture', dairy: 'agriculture',
  logistics: 'logistics', transport: 'logistics', transportation: 'logistics', 'supply chain': 'logistics', shipping: 'logistics', warehousing: 'logistics', warehouse: 'logistics',
  technology: 'technology', tech: 'technology', it: 'technology', software: 'technology', saas: 'technology', electronics: 'technology', digital: 'technology', 'information technology': 'technology',
  healthcare: 'healthcare', health: 'healthcare', medical: 'healthcare', pharma: 'healthcare', pharmaceutical: 'healthcare', hospital: 'healthcare', wellness: 'healthcare',
  education: 'education', edtech: 'education', training: 'education', school: 'education', college: 'education', institute: 'education', academy: 'education',
  other: 'other', others: 'other', misc: 'other', general: 'other', service: 'other', services: 'other', consultancy: 'other', consulting: 'other',
};

const STATUS_SYNONYMS: Record<string, CompanyStatus> = {
  active: 'active', ongoing: 'active', 'in progress': 'active', live: 'active', open: 'active',
  'on hold': 'on_hold', hold: 'on_hold', paused: 'on_hold', pending: 'on_hold', onhold: 'on_hold',
  completed: 'completed', complete: 'completed', done: 'completed', closed: 'completed', finished: 'completed',
};

/* ------------------------------------------------------------------ *
 * Parse
 * ------------------------------------------------------------------ */

export type CompanyRow = Record<CompanyField, string>;

const EMPTY_ROW: CompanyRow = Object.fromEntries(
  (Object.keys(FIELD_SYNONYMS) as CompanyField[]).map((f) => [f, ''])
) as CompanyRow;

export interface ParsedCompanies {
  rows: CompanyRow[];
  mappedFields: CompanyField[];
  unmappedHeaders: string[];
  skippedRows: number;
}

export function gridToCompanies(grid: string[][]): ParsedCompanies {
  if (grid.length === 0) {
    return { rows: [], mappedFields: [], unmappedHeaders: [], skippedRows: 0 };
  }
  const [headerRow, ...dataRows] = grid;

  const indexToField = new Map<number, CompanyField>();
  const mappedFields: CompanyField[] = [];
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

  const rows: CompanyRow[] = [];
  let skippedRows = 0;

  for (const cells of dataRows) {
    const row: CompanyRow = { ...EMPTY_ROW };
    indexToField.forEach((field, index) => {
      row[field] = (cells[index] ?? '').toString().trim();
    });
    // A company needs a name to be meaningful.
    if (row.name === '') {
      if (cells.some((c) => (c ?? '').toString().trim() !== '')) skippedRows += 1;
      continue;
    }
    rows.push(row);
  }

  return { rows, mappedFields, unmappedHeaders, skippedRows };
}

/* ------------------------------------------------------------------ *
 * Value coercion
 * ------------------------------------------------------------------ */

const nullable = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
};

export function parseIndustry(raw: string): Industry | null {
  const key = normalizeHeader(raw);
  return key === '' ? null : (INDUSTRY_SYNONYMS[key] ?? null);
}

export function parseStatus(raw: string): CompanyStatus | null {
  const key = normalizeHeader(raw);
  return key === '' ? null : (STATUS_SYNONYMS[key] ?? null);
}

/** Only the fields a row actually provides, so a merge never clobbers with blanks. */
function rowToDraft(row: CompanyRow): Partial<CompanyInput> {
  const draft: Partial<CompanyInput> = {};
  const udyam = nullable(row.udyamNumber);
  if (udyam) draft.udyamNumber = udyam;
  const cName = nullable(row.contactName);
  if (cName) draft.contactName = cName;
  const cPhone = nullable(row.contactPhone);
  if (cPhone) draft.contactPhone = cPhone;
  const cEmail = nullable(row.contactEmail);
  if (cEmail) draft.contactEmail = cEmail;
  const website = nullable(row.website);
  if (website) draft.website = website;
  const district = nullable(row.district);
  if (district) draft.district = district;
  const ramp = nullable(row.ramp);
  if (ramp) draft.ramp = ramp;
  const membership = nullable(row.membership);
  if (membership) draft.membership = membership;
  const source = nullable(row.source);
  if (source) draft.acquisitionSource = source;

  const industry = parseIndustry(row.domain);
  if (industry) draft.industry = industry;
  const status = parseStatus(row.status);
  if (status) draft.status = status;

  // "Mode of Consultation" (and any Domain text that didn't match a sector) has
  // no dedicated field — keep it in notes so it isn't lost.
  const noteParts: string[] = [];
  const notes = nullable(row.notes);
  if (notes) noteParts.push(notes);
  const mode = nullable(row.mode);
  if (mode) noteParts.push(`Mode of consultation: ${mode}`);
  const domain = nullable(row.domain);
  if (domain && !industry) noteParts.push(`Domain: ${domain}`);
  if (noteParts.length) draft.notes = noteParts.join(' · ');

  return draft;
}

function blankCompanyInput(name: string): CompanyInput {
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

/* ------------------------------------------------------------------ *
 * Plan + materialise
 * ------------------------------------------------------------------ */

const companyKey = (name: string): string => normalizeHeader(name);

export interface CompanyImportPlan {
  newCompanies: CompanyInput[];
  updates: { id: string; merged: CompanyInput }[];
  newCount: number;
  updatedCount: number;
  total: number;
}

export function buildCompanyPlan(rows: CompanyRow[], existing: Company[]): CompanyImportPlan {
  const existingByKey = new Map<string, Company>();
  existing.forEach((c) => {
    const key = companyKey(c.name);
    if (!existingByKey.has(key)) existingByKey.set(key, c);
  });

  // Accumulate per key so duplicate rows in the same import merge together.
  const order: string[] = [];
  const drafts = new Map<string, { name: string; draft: Partial<CompanyInput> }>();
  for (const row of rows) {
    const name = row.name.trim();
    if (name === '') continue;
    const key = companyKey(name);
    const draft = rowToDraft(row);
    const current = drafts.get(key);
    if (current) Object.assign(current.draft, draft);
    else {
      drafts.set(key, { name, draft });
      order.push(key);
    }
  }

  const newCompanies: CompanyInput[] = [];
  const updates: { id: string; merged: CompanyInput }[] = [];
  for (const key of order) {
    const { name, draft } = drafts.get(key)!;
    const existingCo = existingByKey.get(key);
    if (existingCo) {
      const { id, createdAt: _c, updatedAt: _u, ...rest } = existingCo;
      void _c;
      void _u;
      updates.push({ id, merged: { ...rest, ...draft } });
    } else {
      newCompanies.push({ ...blankCompanyInput(name), ...draft });
    }
  }

  return {
    newCompanies,
    updates,
    newCount: newCompanies.length,
    updatedCount: updates.length,
    total: newCompanies.length + updates.length,
  };
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The full next Companies array (existing — enriched — plus the new ones). */
export function materializeCompanyImport(
  plan: CompanyImportPlan,
  currentCompanies: Company[]
): Company[] {
  const now = new Date().toISOString();
  const updateById = new Map(plan.updates.map((u) => [u.id, u.merged]));

  const next: Company[] = currentCompanies.map((c) => {
    const merged = updateById.get(c.id);
    return merged ? { ...c, ...merged, id: c.id, createdAt: c.createdAt, updatedAt: now } : c;
  });

  for (const input of plan.newCompanies) {
    next.push({ ...input, id: genId(), createdAt: now, updatedAt: now });
  }

  return next;
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

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

export function downloadCompanyTemplate(): void {
  // The familiar master-sheet headers, so an existing sheet pastes straight in.
  const headers = [
    'Company Name',
    'UDYAM No.',
    'Contact',
    'Email Id.',
    'Domain',
    'Mode of Consultation',
    'Status',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');
  XLSX.writeFile(wb, 'mccia-companies-template.xlsx');
}
