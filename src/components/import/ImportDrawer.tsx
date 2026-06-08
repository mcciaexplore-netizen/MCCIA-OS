import { useEffect, useRef, useState } from 'react';
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
import { errorMessage } from '@/hooks/mutationUtils';
import { cn } from '@/utils/cn';
import {
  fetchGoogleSheetCsv,
  parseDelimitedText,
  readWorkbookGrid,
} from '@/utils/consultationIO';

/** Result of parsing a source grid for one import kind. */
export interface ParsedResult<Row> {
  rows: Row[];
  mappedFields: string[];
  unmappedHeaders: string[];
  /** Pre-formatted, human-readable warnings to show in the preview. */
  warnings: string[];
}

/** Everything that differs between importing consultations vs. projects. */
export interface ImportKind<Row> {
  title: string;
  description: string;
  /** Singular noun used in the success toast, e.g. "consultation". */
  recordNoun: string;
  parse: (grid: string[][]) => ParsedResult<Row>;
  previewColumns: { header: string; cell: (row: Row) => string }[];
  downloadTemplate: () => void;
  /** Read-fresh → plan → atomic write. Returns counts for the toast. */
  runImport: (rows: Row[]) => Promise<{ records: number; companies: number }>;
  /** Optional custom success toast; defaults to "Imported N nouns across M companies." */
  successMessage?: (result: { records: number; companies: number }) => string;
}

type SourceMode = 'file' | 'paste' | 'link';

const MODES: { value: SourceMode; label: string; icon: typeof Upload }[] = [
  { value: 'file', label: 'Excel file', icon: FileSpreadsheet },
  { value: 'paste', label: 'Paste rows', icon: ClipboardPaste },
  { value: 'link', label: 'Sheets link', icon: Link2 },
];

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const companyWord = (n: number) => `${n} compan${n === 1 ? 'y' : 'ies'}`;

interface ImportDrawerProps<Row> {
  open: boolean;
  onClose: () => void;
  kind: ImportKind<Row>;
}

/**
 * Generic bulk-import drawer. The source handling (file upload / paste / Google
 * Sheets link), the preview, and the atomic-write feedback are shared; the
 * `kind` config supplies the parser, preview columns, template, and importer.
 */
export function ImportDrawer<Row>({ open, onClose, kind }: ImportDrawerProps<Row>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<SourceMode>('file');
  const [pasteText, setPasteText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [parsed, setParsed] = useState<ParsedResult<Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const applyGrid = (grid: string[][]) => {
    const result = kind.parse(grid);
    setParsed(result);
    setError(
      result.mappedFields.length === 0
        ? 'No recognisable columns found. Check the header row matches the expected columns.'
        : null
    );
  };

  const handleFile = async (file: File) => {
    setError(null);
    setParsed(null);
    try {
      applyGrid(readWorkbookGrid(await file.arrayBuffer()));
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
      applyGrid(parseDelimitedText(await fetchGoogleSheetCsv(linkUrl.trim())));
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
      const result = await kind.runImport(parsed.rows);
      toast.success(
        kind.successMessage
          ? kind.successMessage(result)
          : `Imported ${plural(result.records, kind.recordNoun)} across ${companyWord(result.companies)}.`
      );
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Import failed — no changes were made.'));
    } finally {
      setImporting(false);
    }
  };

  const rowCount = parsed?.rows.length ?? 0;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={kind.title}
      description={kind.description}
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={kind.downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download template
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={runImport} loading={importing} disabled={rowCount === 0}>
              {rowCount > 0 ? `Import ${plural(rowCount, 'row')}` : 'Import'}
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

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {parsed && <Preview parsed={parsed} kind={kind} />}
      </div>
    </SlideOver>
  );
}

function Preview<Row>({ parsed, kind }: { parsed: ParsedResult<Row>; kind: ImportKind<Row> }) {
  const { rows, mappedFields, unmappedHeaders, warnings } = parsed;
  if (rows.length === 0 && mappedFields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
        Ready to import
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label="Rows" value={rows.length} />
        <Stat label="Columns matched" value={mappedFields.length} />
      </div>

      {warnings.map((w) => (
        <p key={w} className="text-xs text-amber-600 dark:text-amber-400">
          {w}
        </p>
      ))}

      {unmappedHeaders.length > 0 && (
        <p className="text-xs text-slate-400">Ignored columns: {unmappedHeaders.join(', ')}</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                {kind.previewColumns.map((c) => (
                  <th key={c.header} className="px-2.5 py-1.5 font-medium">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.slice(0, 4).map((row, i) => (
                <tr key={i} className="text-slate-700 dark:text-slate-300">
                  {kind.previewColumns.map((c) => (
                    <td key={c.header} className="max-w-[10rem] truncate px-2.5 py-1.5">
                      {c.cell(row)}
                    </td>
                  ))}
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
