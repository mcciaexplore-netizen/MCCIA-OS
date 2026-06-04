import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Link2,
  Upload,
} from 'lucide-react';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea, TextInput } from '@/components/form/fields';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { SHEET_NAMES } from '@/constants';
import type { Company, ConsultingSession } from '@/types';
import { useCompanies } from '@/hooks/useCompanies';
import { errorMessage } from '@/hooks/mutationUtils';
import { cn } from '@/utils/cn';
import {
  buildImportPlan,
  downloadImportTemplate,
  fetchGoogleSheetCsv,
  gridToConsultations,
  materializeImport,
  parseDelimitedText,
  readWorkbookGrid,
  type ParsedImport,
} from '@/utils/consultationIO';

type SourceMode = 'file' | 'paste' | 'link';

const MODES: { value: SourceMode; label: string; icon: typeof Upload }[] = [
  { value: 'file', label: 'Excel file', icon: FileSpreadsheet },
  { value: 'paste', label: 'Paste rows', icon: ClipboardPaste },
  { value: 'link', label: 'Sheets link', icon: Link2 },
];

interface BulkImportDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bulk-import consultations from an Excel/CSV file, pasted cells, or a public
 * Google Sheets link. Each row becomes a company (found-or-created by name) plus
 * a linked consulting session. Shows a parsed preview before writing anything.
 */
export function BulkImportDrawer({ open, onClose }: BulkImportDrawerProps) {
  const qc = useQueryClient();
  const companiesQuery = useCompanies();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<SourceMode>('file');
  const [pasteText, setPasteText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);

  // Reset everything each time the drawer is opened.
  useEffect(() => {
    if (!open) return;
    setMode('file');
    setPasteText('');
    setLinkUrl('');
    setParsed(null);
    setError(null);
    setFetching(false);
    setImporting(false);
  }, [open]);

  const existingCompanies = useMemo<Company[]>(
    () => companiesQuery.data ?? [],
    [companiesQuery.data]
  );

  const plan = useMemo(
    () => (parsed ? buildImportPlan(parsed.rows, existingCompanies) : null),
    [parsed, existingCompanies]
  );

  const applyGrid = (grid: string[][]) => {
    const result = gridToConsultations(grid);
    setParsed(result);
    if (result.mappedFields.length === 0) {
      setError('No recognisable columns found. Check the header row matches the expected columns.');
    } else {
      setError(null);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setParsed(null);
    try {
      const buffer = await file.arrayBuffer();
      applyGrid(readWorkbookGrid(buffer));
    } catch {
      setError('Could not read that file. Please use a .xlsx, .xls, or .csv file.');
    }
  };

  const handlePastePreview = () => {
    setError(null);
    if (!pasteText.trim()) {
      setError('Paste some rows first (including the header row).');
      return;
    }
    applyGrid(parseDelimitedText(pasteText));
  };

  const handleLinkFetch = async () => {
    setError(null);
    setParsed(null);
    setFetching(true);
    try {
      const csv = await fetchGoogleSheetCsv(linkUrl.trim());
      applyGrid(parseDelimitedText(csv));
    } catch (e) {
      setError(errorMessage(e, 'Could not fetch the sheet.'));
    } finally {
      setFetching(false);
    }
  };

  const runImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    try {
      // Recompute against the freshest data, then write both sheets atomically
      // (all-or-nothing) so a failure mid-way never leaves a half-done import.
      const [currentCompanies, currentSessions] = await Promise.all([
        sheets.read<Company>(SHEET_NAMES.companies),
        sheets.read<ConsultingSession>(SHEET_NAMES.consultingSessions),
      ]);
      const execPlan = buildImportPlan(parsed.rows, currentCompanies);
      const { companies, sessions } = materializeImport(execPlan, currentCompanies, currentSessions);

      await sheets.overwriteMany([
        { sheet: SHEET_NAMES.companies, rows: companies },
        { sheet: SHEET_NAMES.consultingSessions, rows: sessions },
      ]);
      await qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      await qc.invalidateQueries({ queryKey: queryKeys.consultingSessions.all });

      const n = execPlan.sessions.length;
      toast.success(
        `Imported ${n} consultation${n === 1 ? '' : 's'} across ${execPlan.companyCount} compan${
          execPlan.companyCount === 1 ? 'y' : 'ies'
        }.`
      );
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Import failed — no changes were made.'));
    } finally {
      setImporting(false);
    }
  };

  const rowCount = parsed?.rows.length ?? 0;
  const canImport = rowCount > 0 && !importing;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Import consultations"
      description="From an Excel file, pasted cells, or a Google Sheets link."
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={downloadImportTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download template
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={runImport} loading={importing} disabled={!canImport}>
              {rowCount > 0 ? `Import ${rowCount} row${rowCount === 1 ? '' : 's'}` : 'Import'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Source picker */}
        <div className="inline-flex w-full rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
          {MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setParsed(null);
                setError(null);
              }}
              aria-pressed={mode === value}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                mode === value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Source input */}
        {mode === 'file' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-brand-950/20"
            >
              <Upload className="h-6 w-6 text-slate-400" aria-hidden />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Choose an Excel or CSV file
              </span>
              <span className="text-xs text-slate-400">.xlsx, .xls, or .csv — first sheet is read</span>
            </button>
          </div>
        )}

        {mode === 'paste' && (
          <div className="space-y-2">
            <FormField
              label="Paste cells from your sheet"
              htmlFor="paste"
              hint="Select the rows in Google Sheets / Excel (including the header row) and paste here."
            >
              <TextArea
                id="paste"
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'Company Name\tUDYAM No.\tPerson Name\t…\nAcme Pvt Ltd\tUDYAM-MH-…\tR. Sharma\t…'}
              />
            </FormField>
            <Button type="button" variant="secondary" size="sm" onClick={handlePastePreview}>
              Preview
            </Button>
          </div>
        )}

        {mode === 'link' && (
          <div className="space-y-2">
            <FormField
              label="Google Sheets link"
              htmlFor="link"
              hint="The sheet must be shared as “Anyone with the link can view”."
            >
              <TextInput
                id="link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
            </FormField>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={fetching}
              disabled={!linkUrl.trim()}
              onClick={handleLinkFetch}
            >
              Fetch sheet
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Preview */}
        {parsed && plan && (
          <ImportPreview parsed={parsed} newCount={plan.newCompanies.length} />
        )}
      </div>
    </SlideOver>
  );
}

/* ------------------------------------------------------------------ *
 * Parsed preview
 * ------------------------------------------------------------------ */

function ImportPreview({ parsed, newCount }: { parsed: ParsedImport; newCount: number }) {
  const { rows, mappedFields, unmappedHeaders, skippedRows, unparsedDates, invalidEmails } = parsed;

  if (rows.length === 0 && mappedFields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
        Ready to import
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Rows" value={rows.length} />
        <Stat label="New companies" value={newCount} />
        <Stat label="Columns matched" value={mappedFields.length} />
      </div>

      {skippedRows > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {skippedRows} row{skippedRows === 1 ? '' : 's'} skipped (no company name).
        </p>
      )}

      {unparsedDates > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {unparsedDates} date{unparsedDates === 1 ? '' : 's'} couldn’t be read and will be left blank.
        </p>
      )}

      {invalidEmails > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {invalidEmails} row{invalidEmails === 1 ? '' : 's'} have an unrecognised email format (kept as-is).
        </p>
      )}

      {unmappedHeaders.length > 0 && (
        <p className="text-xs text-slate-400">
          Ignored columns: {unmappedHeaders.join(', ')}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Company</th>
                <th className="px-2.5 py-1.5 font-medium">Date</th>
                <th className="px-2.5 py-1.5 font-medium">Query</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.slice(0, 4).map((row, i) => (
                <tr key={i} className="text-slate-700 dark:text-slate-300">
                  <td className="truncate px-2.5 py-1.5">{row.companyName}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-slate-500">{row.date || '—'}</td>
                  <td className="max-w-[10rem] truncate px-2.5 py-1.5">{row.meetingQuery || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 4 && (
            <div className="bg-slate-50 px-2.5 py-1.5 text-center text-xs text-slate-400 dark:bg-slate-800/50">
              + {rows.length - 4} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-800/50">
      <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
