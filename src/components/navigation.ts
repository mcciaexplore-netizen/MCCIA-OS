import {
  Building2,
  LayoutDashboard,
  Megaphone,
  Rocket,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants';

export interface NavItem {
  label: string;
  shortLabel: string;
  to: string;
  icon: LucideIcon;
  /** Exact match required (used for the index route). */
  end?: boolean;
}

/** Single source of truth for primary navigation across sidebar + mobile nav. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Home', to: ROUTES.dashboard, icon: LayoutDashboard, end: true },
  { label: 'Consulting', shortLabel: 'Consult', to: ROUTES.consulting, icon: Briefcase },
  { label: 'App Development', shortLabel: 'Apps', to: ROUTES.appdev, icon: Rocket },
  { label: 'Social', shortLabel: 'Social', to: ROUTES.social, icon: Megaphone },
  { label: 'Companies', shortLabel: 'Clients', to: ROUTES.companies, icon: Building2 },
];
