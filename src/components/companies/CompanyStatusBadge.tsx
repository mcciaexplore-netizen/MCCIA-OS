import { Badge } from '@/components/ui/Badge';
import { COMPANY_STATUS_LABELS } from '@/constants';
import type { CompanyStatus } from '@/types';
import { companyStatusTone } from '@/utils/status';

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  return <Badge tone={companyStatusTone(status)}>{COMPANY_STATUS_LABELS[status]}</Badge>;
}
