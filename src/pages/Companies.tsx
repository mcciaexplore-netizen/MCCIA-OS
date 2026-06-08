import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Download, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { CompanyDrawer } from '@/components/CompanyDrawer';
import { useRegisterNewAction } from '@/components/command/useAppCommand';
import { useCompaniesWithStats } from '@/hooks/useCompaniesWithStats';
import { sheets } from '@/api/sheets';
import { COMPANY_STATUS_LABELS, SHEET_NAMES } from '@/constants';
import type { Company, CompanyStatus } from '@/types';
import { errorMessage } from '@/hooks/mutationUtils';
import { cn } from '@/utils/cn';

// SheetJS-heavy drawer: loaded on demand so it stays out of the Companies chunk.
const CompanyImportDrawer = lazy(() =>
  import('@/components/CompanyImportDrawer').then((m) => ({ default: m.CompanyImportDrawer }))
);

type StatusFilter = 'all' | CompanyStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: COMPANY_STATUS_LABELS.active },
  { key: 'on_hold', label: COMPANY_STATUS_LABELS.on_hold },
  { key: 'completed', label: COMPANY_STATUS_LABELS.completed },
];

// Render a bounded page of cards so the list stays fast with tens of thousands
// of companies (filtering/search still runs across the whole set).
const PAGE_SIZE = 48;

export function Companies() {
  const { data, isPending, isError, error, refetch } = useCompaniesWithStats();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Import / export.
  const [importOpen, setImportOpen] = useState(false);
  const [importLoaded, setImportLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const companies = data ?? [];

  useRegisterNewAction('company', () => setDrawerOpen(true));

  const openImport = () => {
    setImportLoaded(true);
    setImportOpen(true);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const [{ exportCompaniesToXlsx }, allCompanies] = await Promise.all([
        import('@/utils/companyIO'),
        sheets.read<Company>(SHEET_NAMES.companies),
      ]);
      exportCompaniesToXlsx(allCompanies);
      toast.success('Excel workbook downloaded');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not export to Excel'));
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter((company) => {
      const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
      if (!matchesStatus) return false;
      if (query === '') return true;
      return (
        company.name.toLowerCase().includes(query) ||
        (company.contactName ?? '').toLowerCase().includes(query) ||
        (company.contactEmail ?? '').toLowerCase().includes(query) ||
        (company.contactPhone ?? '').toLowerCase().includes(query) ||
        (company.udyamNumber ?? '').toLowerCase().includes(query)
      );
    });
  }, [data, search, statusFilter]);

  // Jump back to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="The master record for every client MCCIA works with."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={openImport}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm" variant="secondary" onClick={exportExcel} loading={exporting}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add company
            </Button>
          </div>
        }
      />

      {/* Search + status filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or contact…"
            aria-label="Search companies"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === key
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add your first client, or import your whole list from Excel to get going fast."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                Add your first company
              </Button>
              <Button variant="secondary" onClick={openImport}>
                <Upload className="h-4 w-4" />
                Import from Excel
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No companies match your search or filters. Try adjusting them."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pageItems.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-200">{rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}</span>{' '}
                of <span className="font-medium text-slate-700 dark:text-slate-200">{filtered.length.toLocaleString()}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="px-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CompanyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {importLoaded && (
        <Suspense fallback={null}>
          <CompanyImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
