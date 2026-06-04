import { lazy, Suspense, useMemo, useState } from 'react';
import { format, isSameMonth } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Plus,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/form/fields';
import { FollowUpBadge } from '@/components/consulting/FollowUpBadge';
import { IndustryBadge } from '@/components/companies/IndustryBadge';
import { LogSessionDrawer } from '@/components/LogSessionDrawer';
import { useRegisterNewAction } from '@/components/command/useAppCommand';
import { useCompanies } from '@/hooks/useCompanies';
import {
  useConsultingSessions,
  useUpdateConsultingSession,
} from '@/hooks/useConsultingSessions';
import { useCreateFollowUp, useFollowUps, useUpdateFollowUp } from '@/hooks/useFollowUps';
import { SESSION_OUTCOME_LABELS, SESSION_OUTCOME_OPTIONS } from '@/constants';
import type { Company, ConsultingSession, SessionOutcome } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate, parseDate } from '@/utils/date';
import { sessionOutcomeTone } from '@/utils/status';
import {
  computeFollowUpDate,
  FOLLOWUP_INTERVALS,
  FOLLOWUP_LABELS,
  getDaysUntil,
  resolveSessionFollowUp,
  urgencyRank,
  type FollowUpInterval,
  type FollowUpUrgency,
  type SessionFollowUpState,
} from '@/utils/followup';

// SheetJS-heavy drawer: load it only when the user first opens Import.
const BulkImportDrawer = lazy(() =>
  import('@/components/BulkImportDrawer').then((m) => ({ default: m.BulkImportDrawer }))
);

type StatusFilter = 'all' | FollowUpUrgency | 'none';

export function Consulting() {
  const sessionsQuery = useConsultingSessions();
  const followUpsQuery = useFollowUps();
  const companiesQuery = useCompanies();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoaded, setImportLoaded] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('all');

  const openImport = () => {
    setImportLoaded(true);
    setImportOpen(true);
  };
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useRegisterNewAction('session', () => setDrawerOpen(true));

  const isPending =
    sessionsQuery.isPending || followUpsQuery.isPending || companiesQuery.isPending;
  const queries = [sessionsQuery, followUpsQuery, companiesQuery];
  const firstError = queries.find((q) => q.isError)?.error;

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const followUps = useMemo(() => followUpsQuery.data ?? [], [followUpsQuery.data]);
  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data]);

  const companiesById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies]
  );

  const stats = useMemo(() => {
    const pending = followUps.filter((f) => f.status === 'pending');
    const overdue = pending.filter((f) => getDaysUntil(f.dueDate ?? '') < 0).length;
    const dueThisWeek = pending.filter((f) => {
      const days = getDaysUntil(f.dueDate ?? '');
      return days >= 0 && days <= 7;
    }).length;
    const completedThisMonth = followUps.filter(
      (f) => f.status === 'done' && isSameMonth(parseDate(f.updatedAt) ?? new Date(0), new Date())
    ).length;
    return { overdue, dueThisWeek, completedThisMonth };
  }, [followUps]);

  const rows = useMemo(
    () =>
      sessions.map((session) => ({
        session,
        company: companiesById.get(session.companyId) ?? null,
        state: resolveSessionFollowUp(session.id, followUps),
      })),
    [sessions, followUps, companiesById]
  );

  const filteredRows = useMemo(() => {
    return rows
      .filter(({ session, state }) => {
        if (companyFilter !== 'all' && session.companyId !== companyFilter) return false;
        if (statusFilter === 'none' && state.urgency !== null) return false;
        if (statusFilter !== 'all' && statusFilter !== 'none' && state.urgency !== statusFilter)
          return false;
        const date = session.date ?? '';
        if (from && (!date || date < from)) return false;
        if (to && (!date || date > to)) return false;
        return true;
      })
      .sort((a, b) => {
        const rankDiff = urgencyRank(a.state.urgency) - urgencyRank(b.state.urgency);
        if (rankDiff !== 0) return rankDiff;
        const aKey = a.state.pending?.dueDate ?? a.session.date ?? '';
        const bKey = b.state.pending?.dueDate ?? b.session.date ?? '';
        return aKey.localeCompare(bKey);
      });
  }, [rows, companyFilter, statusFilter, from, to]);

  const companyOptions = [
    { value: 'all', label: 'All companies' },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All follow-ups' },
    { value: 'overdue', label: FOLLOWUP_LABELS.overdue },
    { value: 'today', label: FOLLOWUP_LABELS.today },
    { value: 'this_week', label: FOLLOWUP_LABELS.this_week },
    { value: 'upcoming', label: FOLLOWUP_LABELS.upcoming },
    { value: 'done', label: FOLLOWUP_LABELS.done },
    { value: 'none', label: 'No follow-up' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consulting Tracker"
        description="Log sessions and stay on top of follow-ups across every client."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={openImport}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Log session
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={AlertTriangle}
          label="Overdue follow-ups"
          value={isPending ? null : stats.overdue}
          tone="red"
        />
        <StatCard
          icon={CalendarClock}
          label="Due this week"
          value={isPending ? null : stats.dueThisWeek}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed this month"
          value={isPending ? null : stats.completedThisMonth}
          tone="green"
        />
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Company" htmlFor="filter-company">
          <SelectInput
            id="filter-company"
            options={companyOptions}
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          />
        </FormField>
        <FormField label="Follow-up status" htmlFor="filter-status">
          <SelectInput
            id="filter-status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          />
        </FormField>
        <FormField label="From" htmlFor="filter-from">
          <TextInput
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FormField>
        <FormField label="To" htmlFor="filter-to">
          <TextInput id="filter-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FormField>
      </div>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={() => queries.forEach((q) => q.refetch())} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No sessions logged yet"
          description="Log your first consulting session to start tracking follow-ups."
          action={
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Log session
            </Button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No sessions match"
          description="Try adjusting the company, status, or date filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredRows.map(({ session, company, state }) => (
            <SessionRow key={session.id} session={session} company={company} state={state} />
          ))}
        </div>
      )}

      <LogSessionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {importLoaded && (
        <Suspense fallback={null}>
          <BulkImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

/* ------------------------------ stat card ------------------------------ */

const STAT_TONES = {
  red: 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/30',
  amber: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20',
  green: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20',
} as const;

const STAT_ICON_TONES = {
  red: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className={cn('rounded-xl border p-4', STAT_TONES[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg', STAT_ICON_TONES[tone])}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
        {value === null ? '—' : value}
      </p>
    </div>
  );
}

/* ----------------------------- session row ----------------------------- */

function SessionRow({
  session,
  company,
  state,
}: {
  session: ConsultingSession;
  company: Company | null;
  state: SessionFollowUpState;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const updateFollowUp = useUpdateFollowUp();
  const updateSession = useUpdateConsultingSession();
  const createFollowUp = useCreateFollowUp();

  const [notesDraft, setNotesDraft] = useState(session.notes ?? '');
  const [outcomeDraft, setOutcomeDraft] = useState<SessionOutcome>(session.outcome ?? 'positive');

  const markDone = () => {
    if (!state.pending) return;
    updateFollowUp.mutate({ id: state.pending.id, fields: { status: 'done' } });
  };

  const startEditing = () => {
    setNotesDraft(session.notes ?? '');
    setOutcomeDraft(session.outcome ?? 'positive');
    setEditing(true);
  };

  const saveEdit = () => {
    updateSession.mutate(
      { id: session.id, fields: { notes: notesDraft.trim() || null, outcome: outcomeDraft } },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-slate-900 dark:text-slate-100">
              {company?.name ?? 'Unknown company'}
            </span>
            {company && <IndustryBadge industry={company.industry} />}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="shrink-0">{formatDate(session.date)}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{session.title}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {state.urgency ? (
            <FollowUpBadge urgency={state.urgency} />
          ) : (
            <span className="text-xs text-slate-400">No follow-up</span>
          )}
          {state.pending && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                markDone();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  markDone();
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Mark done
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              expanded && 'rotate-180'
            )}
            aria-hidden
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800">
          {/* Outcome + follow-up date */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Outcome:</span>
              {session.outcome ? (
                <Badge tone={sessionOutcomeTone(session.outcome)}>
                  {SESSION_OUTCOME_LABELS[session.outcome]}
                </Badge>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            {state.followUp?.dueDate && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Follow-up:</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {formatDate(state.followUp.dueDate)}
                  {state.followUp.status === 'done' && ' (done)'}
                </span>
              </div>
            )}
          </div>

          {/* Imported consultation metadata */}
          <SessionMeta session={session} />

          {/* Notes (view / edit) */}
          {editing ? (
            <div className="space-y-3">
              <FormField label="Session notes" htmlFor={`notes-${session.id}`}>
                <TextArea
                  id={`notes-${session.id}`}
                  rows={5}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                />
              </FormField>
              <FormField label="Outcome" htmlFor={`outcome-${session.id}`}>
                <SelectInput
                  id={`outcome-${session.id}`}
                  options={SESSION_OUTCOME_OPTIONS}
                  value={outcomeDraft}
                  onChange={(e) => setOutcomeDraft(e.target.value as SessionOutcome)}
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" loading={updateSession.isPending} onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {session.notes ? (
                <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                  {session.notes}
                </p>
              ) : (
                <p className="text-sm text-slate-400">No notes recorded.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={startEditing}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                {!state.pending && !scheduling && (
                  <Button variant="ghost" size="sm" onClick={() => setScheduling(true)}>
                    <CalendarPlus className="h-4 w-4" />
                    Schedule next follow-up
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Schedule next follow-up */}
          {scheduling && !state.pending && (
            <ScheduleFollowUp
              baseDate={session.date}
              busy={createFollowUp.isPending}
              onCancel={() => setScheduling(false)}
              onConfirm={(dueDate) =>
                createFollowUp.mutate(
                  {
                    companyId: session.companyId,
                    title: session.title,
                    status: 'pending',
                    dueDate,
                    relatedType: 'session',
                    relatedId: session.id,
                    notes: null,
                  },
                  { onSuccess: () => setScheduling(false) }
                )
              }
            />
          )}
        </div>
      )}
    </Card>
  );
}

/* --------------------------- session metadata --------------------------- */

/** Renders the richer fields captured on import (consultant, mode, solution…). */
function SessionMeta({ session }: { session: ConsultingSession }) {
  const details: { label: string; value: string }[] = [
    { label: 'Consultant', value: session.consultant ?? '' },
    { label: 'Mode', value: session.mode ?? '' },
    { label: 'Time slot', value: session.timeSlot ?? '' },
    { label: 'Payment', value: session.payment ?? '' },
    { label: 'Domain', value: session.domain ?? '' },
    { label: 'Status', value: session.consultationStatus ?? '' },
  ].filter((d) => d.value.trim() !== '');

  if (details.length === 0 && !session.summary) return null;

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
      {details.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {details.map((d) => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-slate-400">{d.label}</dt>
              <dd className="truncate font-medium text-slate-700 dark:text-slate-200">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {session.summary && (
        <div>
          <p className="text-xs text-slate-400">Meeting solution</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
            {session.summary}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------- schedule next follow-up ------------------------- */

function ScheduleFollowUp({
  baseDate,
  busy,
  onCancel,
  onConfirm,
}: {
  baseDate: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (dueDate: string) => void;
}) {
  const base = baseDate || format(new Date(), 'yyyy-MM-dd');
  const [interval, setInterval] = useState<FollowUpInterval>('14');
  const [customDate, setCustomDate] = useState('');

  const dueDate =
    interval === 'custom' ? customDate : computeFollowUpDate(base, Number(interval));

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Schedule next follow-up</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FOLLOWUP_INTERVALS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setInterval(option.value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              interval === option.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {interval === 'custom' ? (
          <FormField label="Follow-up date" htmlFor="schedule-custom">
            <TextInput
              id="schedule-custom"
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </FormField>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Due <span className="font-medium text-slate-900 dark:text-slate-100">{formatDate(dueDate)}</span>
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" loading={busy} disabled={!dueDate} onClick={() => dueDate && onConfirm(dueDate)}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
