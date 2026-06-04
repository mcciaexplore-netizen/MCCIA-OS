import { useMemo, useState } from 'react';
import { Megaphone, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { SelectInput } from '@/components/form/fields';
import { CreativeCard } from '@/components/CreativeCard';
import { CreativeDrawer } from '@/components/CreativeDrawer';
import { useRegisterNewAction } from '@/components/command/useAppCommand';
import { useSocialCreatives } from '@/hooks/useSocialCreatives';
import { useCompanies } from '@/hooks/useCompanies';
import { CREATIVE_STATUS_OPTIONS, SOCIAL_PLATFORM_OPTIONS } from '@/constants';
import type { CreativeStatus, SocialCreative, SocialPlatform } from '@/types';

export function SocialPage() {
  const creativesQuery = useSocialCreatives();
  const companiesQuery = useCompanies();

  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<CreativeStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [search, setSearch] = useState('');

  // Drawer state (shared for add + edit).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreative, setDrawerCreative] = useState<SocialCreative | undefined>(undefined);

  const isPending = creativesQuery.isPending || companiesQuery.isPending;
  const queries = [creativesQuery, companiesQuery];
  const firstError = queries.find((q) => q.isError)?.error;

  const creatives = useMemo(() => creativesQuery.data ?? [], [creativesQuery.data]);
  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data]);
  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return creatives.filter((creative) => {
      if (companyFilter !== 'all' && creative.companyId !== companyFilter) return false;
      if (statusFilter !== 'all' && creative.status !== statusFilter) return false;
      if (platformFilter !== 'all' && creative.platform !== platformFilter) return false;
      if (query === '') return true;
      const company = companiesById.get(creative.companyId)?.name ?? '';
      return (
        creative.title.toLowerCase().includes(query) ||
        (creative.caption ?? '').toLowerCase().includes(query) ||
        company.toLowerCase().includes(query)
      );
    });
  }, [creatives, companyFilter, statusFilter, platformFilter, search, companiesById]);

  const openAdd = () => {
    setDrawerCreative(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (creative: SocialCreative) => {
    setDrawerCreative(creative);
    setDrawerOpen(true);
  };

  useRegisterNewAction('creative', openAdd);

  const companyOptions = [
    { value: 'all', label: 'All companies' },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];
  const statusOptions = [{ value: 'all', label: 'All statuses' }, ...CREATIVE_STATUS_OPTIONS];
  const platformOptions = [{ value: 'all', label: 'All platforms' }, ...SOCIAL_PLATFORM_OPTIONS];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social"
        description="Plan, draft, and schedule social media creatives across platforms."
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            New creative
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="sm:w-52">
          <SelectInput
            aria-label="Filter by company"
            options={companyOptions}
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <SelectInput
            aria-label="Filter by status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CreativeStatus | 'all')}
          />
        </div>
        <div className="sm:w-44">
          <SelectInput
            aria-label="Filter by platform"
            options={platformOptions}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as SocialPlatform | 'all')}
          />
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatives…"
            aria-label="Search creatives"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Content */}
      {isPending ? (
        <CardGridSkeleton />
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={() => queries.forEach((q) => q.refetch())} />
      ) : creatives.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No creatives yet"
          description="Social posts and creatives you plan will appear here. Capture your first idea to begin."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              New creative
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No creatives match your filters. Try adjusting the company, status, platform, or search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              company={companiesById.get(creative.companyId) ?? null}
              onEdit={() => openEdit(creative)}
            />
          ))}
        </div>
      )}

      <CreativeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        creative={drawerCreative}
      />
    </div>
  );
}
