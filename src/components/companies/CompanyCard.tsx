import { Link } from 'react-router-dom';
import { Briefcase, Megaphone, Rocket, User, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import type { CompanyWithStats } from '@/types';
import { cn } from '@/utils/cn';
import { COMPANY_STATUS_BORDER } from '@/utils/status';
import { CompanyStatusBadge } from './CompanyStatusBadge';
import { IndustryBadge } from './IndustryBadge';

function Counter({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-slate-50 py-2 dark:bg-slate-800/50">
      <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      <span className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

/** A clickable company summary card with a status-coloured left accent. */
export function CompanyCard({ company }: { company: CompanyWithStats }) {
  return (
    <Link
      to={`${ROUTES.companies}/${company.id}`}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Card
        className={cn(
          'h-full border-l-4 transition-shadow hover:shadow-md',
          COMPANY_STATUS_BORDER[company.status]
        )}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {company.name}
            </h3>
            <CompanyStatusBadge status={company.status} />
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{company.contactName ?? 'No contact yet'}</span>
          </div>

          <div className="mt-3">
            <IndustryBadge industry={company.industry} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Counter icon={Briefcase} value={company.sessionCount} label="Sessions" />
            <Counter icon={Rocket} value={company.projectCount} label="Projects" />
            <Counter icon={Megaphone} value={company.creativeCount} label="Creatives" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
