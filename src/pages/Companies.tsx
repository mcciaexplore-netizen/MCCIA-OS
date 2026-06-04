import { useMemo, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { CompanyDrawer } from '@/components/CompanyDrawer';
import { useRegisterNewAction } from '@/components/command/useAppCommand';
import { useCompaniesWithStats } from '@/hooks/useCompaniesWithStats';
import { COMPANY_STATUS_LABELS } from '@/constants';
import type { CompanyStatus } from '@/types';
import { cn } from '@/utils/cn';

type StatusFilter = 'all' | CompanyStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: COMPANY_STATUS_LABELS.active },
  { key: 'on_hold', label: COMPANY_STATUS_LABELS.on_hold },
  { key: 'completed', label: COMPANY_STATUS_LABELS.completed },
];

export function Companies() {
  const { data, isPending, isError, error, refetch } = useCompaniesWithStats();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const companies = data ?? [];

  useRegisterNewAction('company', () => setDrawerOpen(true));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter((company) => {
      const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
      const matchesSearch =
        query === '' ||
        company.name.toLowerCase().includes(query) ||
        (company.contactName ?? '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="The master record for every client MCCIA works with."
        actions={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            Add company
          </Button>
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
          description="Add your first client to start tracking sessions, projects, and creatives."
          action={
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add your first company
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No companies match your search or filters. Try adjusting them."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      <CompanyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
