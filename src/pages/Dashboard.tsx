import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ImageIcon,
  Megaphone,
  MessageSquare,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, StatGridSkeleton } from '@/components/ui/Skeleton';
import { FollowUpBadge } from '@/components/consulting/FollowUpBadge';
import { useCompanies } from '@/hooks/useCompanies';
import { useConsultingSessions } from '@/hooks/useConsultingSessions';
import { useAppProjects } from '@/hooks/useAppProjects';
import { useSocialCreatives } from '@/hooks/useSocialCreatives';
import { useFollowUps, useUpdateFollowUp } from '@/hooks/useFollowUps';
import {
  PROJECT_STAGE_LABELS,
  PROJECT_STAGE_VALUES,
  ROUTES,
  SOCIAL_PLATFORM_LABELS,
} from '@/constants';
import type { AppProject, Company, ConsultingSession, FollowUp, SocialCreative } from '@/types';
import { formatDate, formatLongDate, formatRelative } from '@/utils/date';
import { getDaysUntil, getFollowUpStatus, urgencyRank, type FollowUpUrgency } from '@/utils/followup';
import { STAGE_ACCENT } from '@/utils/projectStage';
import { useAuth } from '@/auth/useAuth';
import { cn } from '@/utils/cn';

/** Fallback greeting name when no profile is resolved. */
const USER_NAME = 'there';

function timeAwareGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ------------------------------------------------------------------ *
 * Derived dashboard shapes
 * ------------------------------------------------------------------ */

interface AttentionItem {
  id: string;
  kind: 'followup' | 'project';
  urgency: FollowUpUrgency;
  companyName: string;
  description: string;
  /** Drives the "Mark done" action for follow-ups. */
  followUpId?: string;
}

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  description: string;
  timestamp: string;
}

export function Dashboard() {
  const companiesQuery = useCompanies();
  const sessionsQuery = useConsultingSessions();
  const projectsQuery = useAppProjects();
  const creativesQuery = useSocialCreatives();
  const followUpsQuery = useFollowUps();
  const updateFollowUp = useUpdateFollowUp();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queries = [companiesQuery, sessionsQuery, projectsQuery, creativesQuery, followUpsQuery];
  const isPending = queries.some((q) => q.isPending);
  const firstError = queries.find((q) => q.isError)?.error;

  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const creatives = useMemo(() => creativesQuery.data ?? [], [creativesQuery.data]);
  const followUps = useMemo(() => followUpsQuery.data ?? [], [followUpsQuery.data]);
  const companiesById = useMemo(
    () => new Map<string, Company>(companies.map((c) => [c.id, c])),
    [companies]
  );
  const nameFor = (companyId: string) => companiesById.get(companyId)?.name ?? 'Unknown company';

  // --- Stats ------------------------------------------------------------
  const stats = useMemo(() => {
    const pending = followUps.filter((f) => f.status === 'pending');
    const overdue = pending.filter((f) => f.dueDate && getDaysUntil(f.dueDate) < 0).length;
    const dueThisWeek = pending.filter((f) => {
      if (!f.dueDate) return false;
      const days = getDaysUntil(f.dueDate);
      return days >= 0 && days <= 7;
    }).length;
    const activeProjects = projects.filter((p) => p.stage !== 'delivered').length;
    const pendingCreatives = creatives.filter(
      (c) => c.status === 'draft' || c.status === 'scheduled'
    ).length;
    return { overdue, dueThisWeek, activeProjects, pendingCreatives };
  }, [followUps, projects, creatives]);

  // --- Attention required ----------------------------------------------
  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const f of followUps) {
      if (f.status !== 'pending' || !f.dueDate) continue;
      const days = getDaysUntil(f.dueDate);
      if (days > 0) continue; // only overdue or due-today belong here
      items.push({
        id: `followup-${f.id}`,
        kind: 'followup',
        urgency: getFollowUpStatus(f.dueDate),
        companyName: nameFor(f.companyId),
        description: f.title,
        followUpId: f.id,
      });
    }

    for (const p of projects) {
      if (p.stage === 'delivered' || !p.targetLaunchDate) continue;
      if (getDaysUntil(p.targetLaunchDate) >= 0) continue;
      items.push({
        id: `project-${p.id}`,
        kind: 'project',
        urgency: 'overdue',
        companyName: nameFor(p.companyId),
        description: `${p.name} · target launch ${formatDate(p.targetLaunchDate)} passed`,
      });
    }

    return items.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUps, projects, companiesById]);

  // --- Upcoming follow-ups (next 7 days, excludes today/overdue) --------
  const upcoming = useMemo(
    () =>
      followUps
        .filter((f) => {
          if (f.status !== 'pending' || !f.dueDate) return false;
          const days = getDaysUntil(f.dueDate);
          return days >= 1 && days <= 7;
        })
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [followUps]
  );

  // --- App dev snapshot -------------------------------------------------
  const stageCounts = useMemo(
    () =>
      PROJECT_STAGE_VALUES.map((stage) => ({
        stage,
        count: projects.filter((p) => p.stage === stage).length,
      })),
    [projects]
  );
  const maxStageCount = Math.max(1, ...stageCounts.map((s) => s.count));

  // --- Recent activity (last 10 actions, by last-touched) ---------------
  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...sessions.map((s: ConsultingSession) => ({
        id: `session-${s.id}`,
        icon: MessageSquare,
        iconClass: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
        description: `Logged session “${s.title}” with ${nameFor(s.companyId)}`,
        timestamp: s.updatedAt,
      })),
      ...projects.map((p: AppProject) => ({
        id: `project-${p.id}`,
        icon: Rocket,
        iconClass: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
        description: `Updated ${p.name} · ${PROJECT_STAGE_LABELS[p.stage]}`,
        timestamp: p.updatedAt,
      })),
      ...creatives.map((c: SocialCreative) => ({
        id: `creative-${c.id}`,
        icon: Megaphone,
        iconClass: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',
        description: `Added creative “${c.title}” · ${SOCIAL_PLATFORM_LABELS[c.platform]}`,
        timestamp: c.updatedAt,
      })),
    ];
    return items
      .filter((i) => Boolean(i.timestamp))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, projects, creatives, companiesById]);

  const greeting = timeAwareGreeting(new Date().getHours());
  const attentionCount = attention.length;
  const subline = attentionCount
    ? `You have ${attentionCount} ${attentionCount === 1 ? 'thing' : 'things'} needing attention today.`
    : "You're all caught up — nothing needs your attention right now.";

  const onMarkDone = (id: string) =>
    updateFollowUp.mutate({ id, fields: { status: 'done' } });

  return (
    <div className="space-y-6">
      {/* Section 1 — Today's briefing */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {greeting}, {user?.name ?? USER_NAME}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatLongDate()}</p>
        {!isPending && !firstError && (
          <p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-300">{subline}</p>
        )}
      </div>

      {isPending ? (
        <div className="space-y-6">
          <StatGridSkeleton />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={() => queries.forEach((q) => q.refetch())} />
      ) : (
        <>
          {/* Section 2 — Stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Overdue follow-ups"
              value={stats.overdue}
              icon={AlertTriangle}
              accent="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
              valueClass={stats.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
            />
            <StatCard
              label="Due this week"
              value={stats.dueThisWeek}
              icon={CalendarClock}
              accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            />
            <StatCard
              label="Active dev projects"
              value={stats.activeProjects}
              icon={Rocket}
              accent="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"
            />
            <StatCard
              label="Creatives pending"
              value={stats.pendingCreatives}
              icon={ImageIcon}
              accent="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300"
            />
          </div>

          {/* Section 3 — Attention required */}
          <Card>
            <CardBody>
              <SectionHeading
                icon={AlertTriangle}
                title="Attention required"
                count={attentionCount}
              />
              {attentionCount === 0 ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-6 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                  <CheckCircle2
                    className="h-8 w-8 text-emerald-500 dark:text-emerald-400"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    All clear
                  </p>
                  <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/80">
                    Nothing overdue or due today. Nice work.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {attention.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <FollowUpBadge urgency={item.urgency} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.companyName}
                        </p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>
                      {item.kind === 'followup' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={
                            updateFollowUp.isPending &&
                            updateFollowUp.variables?.id === item.followUpId
                          }
                          onClick={() => item.followUpId && onMarkDone(item.followUpId)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark done
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(ROUTES.appdev)}
                        >
                          View project
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Section 4 — Two-column: upcoming + app dev snapshot */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left — Upcoming follow-ups */}
            <Card>
              <CardBody>
                <SectionHeading
                  icon={CalendarDays}
                  title="Upcoming follow-ups"
                  subtitle="Next 7 days"
                />
                {upcoming.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    No follow-ups scheduled for the coming week.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {upcoming.map((f: FollowUp) => (
                      <li key={f.id} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center dark:bg-slate-800">
                          <span className="text-[10px] font-medium uppercase leading-none text-slate-500 dark:text-slate-400">
                            {formatDate(f.dueDate).split(' ')[1]}
                          </span>
                          <span className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                            {formatDate(f.dueDate).split(' ')[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {f.title}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {nameFor(f.companyId)} · {formatDate(f.dueDate)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Right — App dev snapshot */}
            <Card>
              <CardBody>
                <SectionHeading icon={Rocket} title="App dev snapshot" subtitle="Projects by stage" />
                {projects.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    No projects in the pipeline yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {stageCounts.map(({ stage, count }) => (
                      <li key={stage} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {PROJECT_STAGE_LABELS[stage]}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={cn('h-full rounded-full', STAGE_ACCENT[stage])}
                            style={{ width: `${(count / maxStageCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Section 5 — Recent activity */}
          <Card>
            <CardBody>
              <SectionHeading icon={CalendarDays} title="Recent activity" />
              {activity.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  icon={CalendarDays}
                  title="No activity yet"
                  description="Logged sessions, project updates, and new creatives will show up here."
                />
              ) : (
                <ul className="mt-4 space-y-4">
                  {activity.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id} className="flex items-start gap-3">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            item.iconClass
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {formatRelative(item.timestamp)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Local presentational pieces
 * ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  valueClass?: string;
}

function StatCard({ label, value, icon: Icon, accent, valueClass }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p
          className={cn(
            'mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50',
            valueClass
          )}
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  count,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {typeof count === 'number' && count > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {count}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</span>
      )}
    </div>
  );
}
