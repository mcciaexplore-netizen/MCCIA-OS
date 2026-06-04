/**
 * Import / export of consultation data as Excel (.xlsx), CSV, or pasted cells.
 *
 * A single spreadsheet row describes one consultation event for a company. On
 * import each row becomes (a) a Company — found-or-created by name — and (b) a
 * linked ConsultingSession. Export does the reverse: it joins every session to
 * its company and writes the same flat 19-column layout, so the data round-trips
 * through Excel/Google Sheets.
 *
 * Everything here is browser-only (SheetJS reads/writes .xlsx client-side); there
 * is no backend involved.
 */

import * as XLSX from 'xlsx';
import type {
  Company,
  CompanyInput,
  ConsultingSession,
  ConsultingSessionInput,
  SessionOutcome,
} from '@/types';

/* ------------------------------------------------------------------ *
 * Canonical columns
 * ------------------------------------------------------------------ */

/** Canonical field keys, in export-column order. */
export type ImportField =
  | 'companyName'
  | 'udyam'
  | 'personName'
  | 'contact'
  | 'email'
  | 'payment'
  | 'domain'
  | 'mode'
  | 'date'
  | 'timeSlot'
  | 'consultationStatus'
  | 'consultant'
  | 'ramp'
  | 'membership'
  | 'membershipVerified'
  | 'acquisition'
  | 'district'
  | 'meetingQuery'
  | 'meetingSolution';

/** Display header written on export, in column order. */
export const EXPORT_COLUMNS: { field: ImportField; header: string }[] = [
  { field: 'companyName', header: 'Company Name' },
  { field: 'udyam', header: 'UDYAM No.' },
  { field: 'personName', header: 'Person Name' },
  { field: 'contact', header: 'Contact' },
  { field: 'email', header: 'Email Id.' },
  { field: 'payment', header: 'Payment' },
  { field: 'domain', header: 'Domain' },
  { field: 'mode', header: 'Mode of Consultation' },
  { field: 'date', header: 'Date' },
  { field: 'timeSlot', header: 'Time Slot' },
  { field: 'consultationStatus', header: 'Consultation Status' },
  { field: 'consultant', header: 'HOD/ Consultant Assigned' },
  { field: 'ramp', header: 'RAMP or Non-RAMP' },
  { field: 'membership', header: 'Member / Non member' },
  { field: 'membershipVerified', header: 'Member/Non Member Verified Version' },
  { field: 'acquisition', header: 'Acquisition From' },
  { field: 'district', header: 'District' },
  { field: 'meetingQuery', header: 'Meeting Query' },
  { field: 'meetingSolution', header: 'Meeting Solution' },
];

/**
 * Accepted header spellings per field (normalised). Includes the source sheet's
 * exact (and mis-spelled) headers — "Acuisiton From", "Meeting Querry" — so the
 * real export imports without renaming columns.
 */
const FIELD_SYNONYMS: Record<ImportField, string[]> = {
  companyName: ['company name', 'company', 'organisation', 'organization', 'name of company'],
  udyam: ['udyam no', 'udyam number', 'udyam', 'udyam registration no', 'udyam reg no'],
  personName: ['person name', 'contact person', 'name', 'person', 'owner name', 'contact name'],
  contact: ['contact', 'contact no', 'contact number', 'phone', 'mobile', 'mobile no'],
  email: ['email id', 'email', 'email address', 'e mail', 'e mail id'],
  payment: ['payment', 'payment status', 'fees', 'fee', 'amount'],
  domain: ['domain', 'sector', 'business domain'],
  mode: ['mode of consultation', 'mode', 'consultation mode'],
  date: ['date', 'consultation date', 'meeting date'],
  timeSlot: ['time slot', 'time', 'slot'],
  consultationStatus: ['consultation status', 'status'],
  consultant: [
    'hod consultant assigned',
    'hod consultant',
    'consultant assigned',
    'consultant',
    'hod',
    'assigned to',
  ],
  ramp: ['ramp or non ramp', 'ramp non ramp', 'ramp', 'ramp status'],
  membership: ['member non member', 'membership', 'member status', 'member'],
  membershipVerified: [
    'member non member verified version',
    'member non member verified',
    'membership verified',
    'verified version',
  ],
  acquisition: [
    'acquisition from',
    'acuisiton from', // sheet's mis-spelling
    'acquired from',
    'acquisition source',
    'acquisition',
    'source',
  ],
  district: ['district', 'location', 'city'],
  meetingQuery: ['meeting query', 'meeting querry', 'query', 'querry', 'requirement'],
  meetingSolution: ['meeting solution', 'solution', 'resolution'],
};

/** Reverse lookup: normalised header → field (built once). */
const HEADER_TO_FIELD: Record<string, ImportField> = (() => {
  const map: Record<string, ImportField> = {};
  (Object.keys(FIELD_SYNONYMS) as ImportField[]).forEach((field) => {
    FIELD_SYNONYMS[field].forEach((syn) => {
      if (!(syn in map)) map[syn] = field;
    });
  });
  return map;
})();

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/* ------------------------------------------------------------------ *
 * Parsed-row shape
 * ------------------------------------------------------------------ */

export type ConsultationRow = Record<ImportField, string>;

const EMPTY_ROW: ConsultationRow = Object.fromEntries(
  EXPORT_COLUMNS.map((c) => [c.field, ''])
) as ConsultationRow;

export interface ParsedImport {
  rows: ConsultationRow[];
  /** Headers from the file that matched a known field. */
  mappedFields: ImportField[];
  /** Headers from the file we could not place. */
  unmappedHeaders: string[];
  /** Rows skipped because they had no company name. */
  skippedRows: number;
}

/** Map a header row to `{ columnIndex → field }`, plus the leftovers. */
function mapHeaderRow(headers: string[]): {
  indexToField: Map<number, ImportField>;
  mappedFields: ImportField[];
  unmappedHeaders: string[];
} {
  const indexToField = new Map<number, ImportField>();
  const mappedFields: ImportField[] = [];
  const unmappedHeaders: string[] = [];

  headers.forEach((raw, index) => {
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

  return { indexToField, mappedFields, unmappedHeaders };
}

/** Turn a raw grid (row 0 = headers) into typed consultation rows. */
export function gridToConsultations(grid: string[][]): ParsedImport {
  if (grid.length === 0) {
    return { rows: [], mappedFields: [], unmappedHeaders: [], skippedRows: 0 };
  }
  const [headerRow, ...dataRows] = grid;
  const { indexToField, mappedFields, unmappedHeaders } = mapHeaderRow(headerRow);

  const rows: ConsultationRow[] = [];
  let skippedRows = 0;

  for (const cells of dataRows) {
    const row: ConsultationRow = { ...EMPTY_ROW };
    indexToField.forEach((field, index) => {
      row[field] = (cells[index] ?? '').toString().trim();
    });
    if (row.companyName === '') {
      // A row with no company can't be attached to anything.
      if (cells.some((c) => (c ?? '').toString().trim() !== '')) skippedRows += 1;
      continue;
    }
    rows.push(row);
  }

  return { rows, mappedFields, unmappedHeaders, skippedRows };
}

/* ------------------------------------------------------------------ *
 * Source readers (Excel file / pasted text / Google Sheets link)
 * ------------------------------------------------------------------ */

/** Read the first sheet of an uploaded .xlsx / .xls / .csv file into a grid. */
export function readWorkbookGrid(data: ArrayBuffer): string[][] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return aoa.map((row) => row.map((cell) => (cell == null ? '' : String(cell))));
}

function detectDelimiter(text: string): '\t' | ',' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > 0 && tabs >= commas ? '\t' : ',';
}

/** Parse pasted CSV/TSV (quoted fields + embedded newlines handled). */
export function parseDelimitedText(text: string): string[][] {
  const delim = detectDelimiter(text);
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalised.length; i += 1) {
    const char = normalised[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalised[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delim) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Best-effort fetch of a published / link-shared Google Sheet as CSV. Works when
 * the sheet is viewable by "Anyone with the link"; otherwise the browser's CORS /
 * auth wall blocks it and the caller should fall back to paste / file upload.
 */
export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error('That does not look like a Google Sheets link.');
  }
  const id = idMatch[1];
  const gid = url.match(/[#&?]gid=([0-9]+)/)?.[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${
    gid ? `&gid=${gid}` : ''
  }`;

  let res: Response;
  try {
    res = await fetch(csvUrl);
  } catch {
    throw new Error(
      'Could not reach the sheet. Share it as “Anyone with the link can view”, or use Paste / file upload instead.'
    );
  }
  if (!res.ok) {
    throw new Error(
      `The sheet responded ${res.status}. Turn on link-sharing (“Anyone with the link can view”), or use Paste / file upload.`
    );
  }
  return res.text();
}

/* ------------------------------------------------------------------ *
 * Value coercion
 * ------------------------------------------------------------------ */

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Parse a messy date cell into an ISO `yyyy-MM-dd` (Indian DD/MM/YYYY assumed). */
export function parseImportDate(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return null;

  // Already ISO (possibly with a time component).
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // d/m/y, d-m-y, d.m.y (day-first, Indian convention).
  const dmy = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmy) {
    let day = Number(dmy[1]);
    let month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    // Repair an obvious MM/DD slip (month can't exceed 12).
    if (month > 12 && day <= 12) [day, month] = [month, day];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // Fallback: let the engine try (handles "5 Dec 2024", "Dec 5, 2024"…).
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return null;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Map a free-text consultation status onto a session outcome (best effort). */
function deriveOutcome(status: string): SessionOutcome | null {
  const s = status.toLowerCase();
  if (s === '') return null;
  if (/(escalat)/.test(s)) return 'escalated';
  if (/(complet|resolv|closed|done|positive|success)/.test(s)) return 'positive';
  if (/(follow|pending|progress|scheduled|open)/.test(s)) return 'needs_follow_up';
  if (/(cancel|no decision|dropped|na)/.test(s)) return 'no_decision';
  return null;
}

/* ------------------------------------------------------------------ *
 * Import plan
 * ------------------------------------------------------------------ */

type SessionDraft = Omit<ConsultingSessionInput, 'companyId'>;

export interface ImportPlan {
  /** New companies to create, keyed by normalised name. */
  newCompanies: { key: string; input: CompanyInput }[];
  /** Blank-field enrichment for companies that already exist. */
  companyPatches: { id: string; fields: Partial<CompanyInput> }[];
  /** Sessions to create, each tagged with its company key. */
  sessions: { key: string; input: SessionDraft }[];
  /** Pre-resolved keys → existing company id. */
  existingByKey: Map<string, string>;
  /** Distinct companies touched (new + matched). */
  companyCount: number;
}

const companyKey = (name: string): string => normalizeHeader(name);

function rowToCompanyInput(row: ConsultationRow): CompanyInput {
  return {
    name: row.companyName.trim(),
    status: 'active',
    industry: null,
    website: null,
    contactName: nullable(row.personName),
    contactEmail: nullable(row.email),
    contactPhone: nullable(row.contact),
    notes: null,
    udyamNumber: nullable(row.udyam),
    district: nullable(row.district),
    acquisitionSource: nullable(row.acquisition),
    ramp: nullable(row.ramp),
    membership: nullable(row.membership),
    membershipVerified: nullable(row.membershipVerified),
  };
}

function rowToSessionDraft(row: ConsultationRow): SessionDraft {
  return {
    title: nullable(row.meetingQuery) ?? nullable(row.domain) ?? 'Consultation',
    date: parseImportDate(row.date),
    durationMinutes: null,
    outcome: deriveOutcome(row.consultationStatus),
    summary: nullable(row.meetingSolution),
    actionItems: null,
    notes: null,
    consultant: nullable(row.consultant),
    mode: nullable(row.mode),
    timeSlot: nullable(row.timeSlot),
    payment: nullable(row.payment),
    domain: nullable(row.domain),
    consultationStatus: nullable(row.consultationStatus),
  };
}

/** Company columns eligible for blank-field enrichment on an existing record. */
const ENRICHABLE: (keyof CompanyInput)[] = [
  'contactName',
  'contactEmail',
  'contactPhone',
  'udyamNumber',
  'district',
  'acquisitionSource',
  'ramp',
  'membership',
  'membershipVerified',
];

const isBlank = (v: unknown): boolean => v == null || (typeof v === 'string' && v.trim() === '');

/**
 * Build the create/enrich/insert plan. Companies are de-duplicated by name
 * (case-insensitive) across the batch and against the existing directory.
 */
export function buildImportPlan(rows: ConsultationRow[], existing: Company[]): ImportPlan {
  const existingByKey = new Map<string, string>();
  const existingById = new Map<string, Company>();
  existing.forEach((c) => {
    existingById.set(c.id, c);
    const key = companyKey(c.name);
    if (!existingByKey.has(key)) existingByKey.set(key, c.id);
  });

  const newCompanies: ImportPlan['newCompanies'] = [];
  const newKeys = new Set<string>();
  const sessions: ImportPlan['sessions'] = [];
  const patchByKey = new Map<string, Partial<CompanyInput>>();

  for (const row of rows) {
    const key = companyKey(row.companyName);
    const candidate = rowToCompanyInput(row);

    const existingId = existingByKey.get(key);
    if (existingId) {
      // Accumulate blank-field enrichment for the matched company.
      const current = existingById.get(existingId);
      const patch = patchByKey.get(key) ?? {};
      ENRICHABLE.forEach((field) => {
        const value = candidate[field];
        const known = patch[field] ?? current?.[field];
        if (!isBlank(value) && isBlank(known)) {
          (patch as Record<string, unknown>)[field] = value;
        }
      });
      if (Object.keys(patch).length > 0) patchByKey.set(key, patch);
    } else if (!newKeys.has(key)) {
      newCompanies.push({ key, input: candidate });
      newKeys.add(key);
    }

    sessions.push({ key, input: rowToSessionDraft(row) });
  }

  const companyPatches = [...patchByKey.entries()].map(([key, fields]) => ({
    id: existingByKey.get(key)!,
    fields,
  }));

  return {
    newCompanies,
    companyPatches,
    sessions,
    existingByKey,
    companyCount: newKeys.size + new Set(companyPatches.map((p) => p.id)).size,
  };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

/** Map a company + (optional) session back onto the flat 19-column row. */
function toExportRecord(company: Company, session: ConsultingSession | null): Record<string, string> {
  const out: Record<string, string> = {};
  const values: Record<ImportField, string> = {
    companyName: company.name ?? '',
    udyam: company.udyamNumber ?? '',
    personName: company.contactName ?? '',
    contact: company.contactPhone ?? '',
    email: company.contactEmail ?? '',
    payment: session?.payment ?? '',
    domain: session?.domain ?? '',
    mode: session?.mode ?? '',
    date: session?.date ?? '',
    timeSlot: session?.timeSlot ?? '',
    consultationStatus: session?.consultationStatus ?? '',
    consultant: session?.consultant ?? '',
    ramp: company.ramp ?? '',
    membership: company.membership ?? '',
    membershipVerified: company.membershipVerified ?? '',
    acquisition: company.acquisitionSource ?? '',
    district: company.district ?? '',
    meetingQuery: session?.title ?? '',
    meetingSolution: session?.summary ?? '',
  };
  EXPORT_COLUMNS.forEach(({ field, header }) => {
    out[header] = values[field];
  });
  return out;
}

/**
 * Download every consultation as an .xlsx workbook. One row per session, joined
 * to its company; companies with no sessions still get a row so nothing is lost.
 */
export function exportConsultationsToXlsx(companies: Company[], sessions: ConsultingSession[]): void {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const records: Record<string, string>[] = [];

  sessions
    .slice()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .forEach((session) => {
      const company = byId.get(session.companyId);
      if (company) records.push(toExportRecord(company, session));
    });

  const companiesWithSession = new Set(sessions.map((s) => s.companyId));
  companies
    .filter((c) => !companiesWithSession.has(c.id))
    .forEach((c) => records.push(toExportRecord(c, null)));

  const headers = EXPORT_COLUMNS.map((c) => c.header);
  const ws =
    records.length > 0
      ? XLSX.utils.json_to_sheet(records, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consultations');
  XLSX.writeFile(wb, `mccia-consultations-${todayStamp()}.xlsx`);
}

/** Download a headers-only .xlsx the user can fill in and re-import. */
export function downloadImportTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_COLUMNS.map((c) => c.header)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consultations');
  XLSX.writeFile(wb, 'mccia-consultations-template.xlsx');
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
