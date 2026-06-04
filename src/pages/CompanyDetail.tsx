import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  Megaphone,
  Pencil,
  Phone,
  Plus,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, type TabDef } from '@/components/ui/Tabs';
import { CompanyDrawer } from '@/components/CompanyDrawer';
import { CompanyStatusBadge } from '@/components/companies/CompanyStatusBadge';
import { IndustryBadge } from '@/components/companies/IndustryBadge';
import { StageBadge } from '@/components/appdev/StageBadge';
import { PlatformBadge } from '@/components/social/PlatformBadge';
import { CreativeStatusBadge } from '@/components/social/CreativeStatusBadge';
import { useCompany } from '@/hooks/useCompanies';
import { useConsultingSessions } from '@/hooks/useConsultingSessions';
import { useAppProjects } from '@/hooks/useAppProjects';
import { useSocialCreatives } from '@/hooks/useSocialCreatives';
import { ROUTES } from '@/constants';
import type { AppProject, Company, ConsultingSession, SocialCreative } from '@/types';
import { formatDate, formatDateTime, formatRelative } from '@/utils/date';
import { buildTimeline, type TimelineKind } from '@/utils/timeline';

type TabKey = 'consulting' | 'projects' | 'social';

const TIMELINE_ICON: Record<TimelineKind, LucideIcon> = {
  session: Briefcase,
  project: Rocket,
  creative: Megaphone,
};

const TIMELINE_ACCENT: Record<TimelineKind, string> = {
  session: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  project: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  creative: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
};

export function CompanyDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('consulting');
  const [editOpen, setEditOpen] = useState(false);

  const companyQuery = useCompany(id);
  const sessions = useConsultingSessions(id);
  const projects = useAppProjects(id);
  const creatives = useSocialCreatives(id);

  if (companyQuery.isPending) return <DetailSkeleton />;
  if (companyQuery.isError) {
    return <ErrorState error={companyQuery.error} onRetry={() => companyQuery.refetch()} />;
  }

  const company = companyQuery.data;
  if (!company) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={Briefcase}
          title="Company not found"
          description="This company may have been removed. Head back to the directory."
          action={
            <Button onClick={() => navigate(ROUTES.companies)}>Back to companies</Button>
          }
        />
      </div>
    );
  }

  const tabs: TabDef[] = [
    { key: 'consulting', label: 'Consulting History', icon: Briefcase, count: sessions.data?.length },
    { key: 'projects', label: 'Dev Projects', icon: Rocket, count: projects.data?.length },
    { key: 'social', label: 'Social Creatives', icon: Megaphone, count: creatives.data?.length },
  ];

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {company.name}
              </h1>
              <CompanyStatusBadge status={company.status} />
              <IndustryBadge industry={company.industry} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              {company.contactName && (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {company.contactName}
                </span>
              )}
              {company.contactEmail && (
                <ContactLink icon={Mail} href={`mailto:${company.contactEmail}`}>
                  {company.contactEmail}
                </ContactLink>
              )}
              {company.contactPhone && (
                <ContactLink icon={Phone} href={`tel:${company.contactPhone}`}>
                  {company.contactPhone}
                </ContactLink>
              )}
              {company.website && (
                <ContactLink icon={Globe} href={company.website} external>
                  Website
                </ContactLink>
              )}
            </div>
            <CompanyMeta company={company} />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </Card>

      {/* Tabs + timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tabs tabs={tabs} active={tab} onChange={(key) => setTab(key as TabKey)} />

          {tab === 'consulting' && (
            <ConsultingTab
              query={sessions}
              onAdd={() => navigate(ROUTES.consulting)}
            />
          )}
          {tab === 'projects' && (
            <ProjectsTab query={projects} onAdd={() => navigate(ROUTES.appdev)} />
          )}
          {tab === 'social' && (
            <SocialTab query={creatives} onAdd={() => navigate(ROUTES.social)} />
          )}
        </div>

        <aside className="lg:col-span-1">
          <ActivityTimeline
            loading={sessions.isPending || projects.isPending || creatives.isPending}
            sessions={sessions.data ?? []}
            projects={projects.data ?? []}
            creatives={creatives.data ?? []}
          />
        </aside>
      </div>

      <CompanyDrawer open={editOpen} onClose={() => setEditOpen(false)} company={company} />
    </div>
  );
}

/* ----------------------------- shared bits ----------------------------- */

function BackLink() {
  return (
    <Link
      to={ROUTES.companies}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      All companies
    </Link>
  );
}

function ContactLink({
  icon: Icon,
  href,
  external,
  children,
}: {
  icon: LucideIcon;
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-300"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </a>
  );
}

/** Chips for the extra fields captured on bulk import (UDYAM, district, RAMP…). */
function CompanyMeta({ company }: { company: Company }) {
  const items: { label: string; value: string }[] = [
    { label: 'UDYAM', value: company.udyamNumber ?? '' },
    { label: 'District', value: company.district ?? '' },
    { label: 'RAMP', value: company.ramp ?? '' },
    { label: 'Membership', value: company.membership ?? '' },
    { label: 'Verified', value: company.membershipVerified ?? '' },
    { label: 'Acquired from', value: company.acquisitionSource ?? '' },
  ].filter((i) => i.value.trim() !== '');

  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <span className="text-slate-400">{item.label}</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function RowCard({ children }: { children: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">{children}</div>
    </Card>
  );
}

function ExternalChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-brand-300"
    >
      <ExternalLink className="h-3 w-3" aria-hidden />
      {label}
    </a>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </Card>
      ))}
    </div>
  );
}

interface TabState<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data?: T[];
  refetch: () => void;
}

function TabHeader({ title, actionLabel, onAdd }: { title: string; actionLabel: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      <Button variant="secondary" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

/* ------------------------------- tabs ------------------------------- */

function ConsultingTab({ query, onAdd }: { query: TabState<ConsultingSession>; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <TabHeader title="Consulting history" actionLabel="Log session" onAdd={onAdd} />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No sessions logged"
          description="Consulting sessions for this company will show up here."
        />
      ) : (
        query.data!.map((session) => (
          <RowCard key={session.id}>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {session.title}
              </p>
              {session.summary && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                  {session.summary}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-slate-400">
              <div>{formatDate(session.date)}</div>
              {session.durationMinutes != null && <div>{session.durationMinutes} min</div>}
            </div>
          </RowCard>
        ))
      )}
    </div>
  );
}

function ProjectsTab({ query, onAdd }: { query: TabState<AppProject>; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <TabHeader title="Dev projects" actionLabel="New project" onAdd={onAdd} />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No projects yet"
          description="App development projects for this company will show up here."
        />
      ) : (
        query.data!.map((project) => (
          <RowCard key={project.id}>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {project.name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StageBadge stage={project.stage} />
                {project.progressPercent != null && (
                  <span className="text-xs text-slate-400">{project.progressPercent}% complete</span>
                )}
              </div>
              {(project.repoUrl || project.liveUrl) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {project.repoUrl && <ExternalChip href={project.repoUrl} label="Repo" />}
                  {project.liveUrl && <ExternalChip href={project.liveUrl} label="Live" />}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-slate-400">
              {formatDate(project.targetLaunchDate)}
            </div>
          </RowCard>
        ))
      )}
    </div>
  );
}

function SocialTab({ query, onAdd }: { query: TabState<SocialCreative>; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <TabHeader title="Social creatives" actionLabel="New creative" onAdd={onAdd} />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No creatives yet"
          description="Social posts and creatives for this company will show up here."
        />
      ) : (
        query.data!.map((creative) => (
          <RowCard key={creative.id}>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {creative.title}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <PlatformBadge platform={creative.platform} />
                <CreativeStatusBadge status={creative.status} date={creative.scheduledFor} />
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-400">
              {formatDateTime(creative.scheduledFor)}
            </div>
          </RowCard>
        ))
      )}
    </div>
  );
}

/* ----------------------------- timeline ----------------------------- */

function ActivityTimeline({
  loading,
  sessions,
  projects,
  creatives,
}: {
  loading: boolean;
  sessions: ConsultingSession[];
  projects: AppProject[];
  creatives: SocialCreative[];
}) {
  const items = buildTimeline(sessions, projects, creatives);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity timeline</h2>
      </div>

      {loading ? (
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-1.5 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No activity yet for this company.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {items.map((item) => {
            const Icon = TIMELINE_ICON[item.kind];
            return (
              <li key={item.id} className="flex gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TIMELINE_ACCENT[item.kind]}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.subtitle} · {formatRelative(item.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ----------------------------- skeleton ----------------------------- */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <Card className="p-5">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="mt-3 h-4 w-2/3" />
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-9 w-full" />
          <ListSkeletonStandalone />
        </div>
        <Card className="p-5 lg:col-span-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-16 w-full" />
        </Card>
      </div>
    </div>
  );
}

function ListSkeletonStandalone() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </Card>
      ))}
    </div>
  );
}
