import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database,
  Download,
  FileSpreadsheet,
  KeyRound,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Upload,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField, SelectInput, TextInput } from '@/components/form/fields';
import { sheets } from '@/api/sheets';
import { SHEET_NAMES, type ThemePreference } from '@/constants';
import type { Company, ConsultingSession } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/auth/useAuth';
import { effectiveUserById, setPasswordHash, setProfile, setRecoveryHash } from '@/auth/account';
import { sha256Hex, verifyPassword } from '@/auth/hash';
import { errorMessage } from '@/hooks/mutationUtils';

// SheetJS-heavy drawer: loaded on demand so it stays out of the Settings chunk.
const BulkImportDrawer = lazy(() =>
  import('@/components/BulkImportDrawer').then((m) => ({ default: m.BulkImportDrawer }))
);
import {
  getFollowUpIntervalPref,
  getTimezonePref,
  listTimezones,
  setFollowUpIntervalPref,
  setTimezonePref,
  type FollowUpIntervalPref,
} from '@/utils/preferences';
import { formatDate } from '@/utils/date';
import { cn } from '@/utils/cn';

const INTERVAL_OPTIONS = [
  { value: '7', label: 'Every 7 days' },
  { value: '14', label: 'Every 14 days' },
  { value: '30', label: 'Every 30 days' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Personalise your workspace and manage your data." />
      <AccountCard />
      <PreferencesCard />
      <ImportExportCard />
      <DataCard />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Account — name/emoji, password, recovery code
 * ------------------------------------------------------------------ */

function AccountCard() {
  const { user, reloadUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [emoji, setEmoji] = useState(user?.emoji ?? '');

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [recPw, setRecPw] = useState('');
  const [newRec, setNewRec] = useState('');

  if (!user) return null;
  const userId = user.id;

  const saveProfile = () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setProfile(userId, { name: name.trim(), emoji: emoji.trim() || user.emoji });
    reloadUser();
    toast.success('Profile updated');
  };

  const verifyCurrent = async (entered: string): Promise<boolean> => {
    const eff = effectiveUserById(userId);
    return !!eff && verifyPassword(eff, entered);
  };

  const changePassword = async () => {
    if (!(await verifyCurrent(curPw))) return toast.error('Current password is incorrect.');
    if (newPw.length < 4) return toast.error('New password must be at least 4 characters.');
    if (newPw !== confirmPw) return toast.error('New passwords do not match.');
    setPasswordHash(userId, await sha256Hex(newPw));
    setCurPw('');
    setNewPw('');
    setConfirmPw('');
    toast.success('Password changed');
  };

  const changeRecovery = async () => {
    if (!(await verifyCurrent(recPw))) return toast.error('Current password is incorrect.');
    if (newRec.length < 4) return toast.error('Recovery code must be at least 4 characters.');
    setRecoveryHash(userId, await sha256Hex(newRec));
    setRecPw('');
    setNewRec('');
    toast.success('Recovery code updated');
  };

  return (
    <SectionCard
      icon={UserCog}
      title="Account"
      description="Your sign-in profile, password, and recovery code (used by “Forgot password”)."
    >
      {/* Profile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[5rem,1fr,auto] sm:items-end">
        <FormField label="Avatar" htmlFor="acc-emoji">
          <TextInput
            id="acc-emoji"
            value={emoji}
            maxLength={4}
            onChange={(e) => setEmoji(e.target.value)}
            className="text-center text-xl"
          />
        </FormField>
        <FormField label="Display name" htmlFor="acc-name">
          <TextInput id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <Button variant="secondary" onClick={saveProfile}>
          Save profile
        </Button>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      {/* Change password */}
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
        <KeyRound className="h-4 w-4 text-slate-400" aria-hidden />
        Change password
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Current password" htmlFor="acc-cur">
          <TextInput id="acc-cur" type="password" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
        </FormField>
        <FormField label="New password" htmlFor="acc-new">
          <TextInput id="acc-new" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </FormField>
        <FormField label="Confirm new" htmlFor="acc-confirm">
          <TextInput id="acc-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </FormField>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" onClick={changePassword} disabled={!curPw || !newPw || !confirmPw}>
          Update password
        </Button>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      {/* Change recovery code */}
      <p className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">Recovery code</p>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Used to reset your password from the login screen if you forget it. Keep it somewhere safe.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Current password" htmlFor="acc-recpw">
          <TextInput id="acc-recpw" type="password" autoComplete="current-password" value={recPw} onChange={(e) => setRecPw(e.target.value)} />
        </FormField>
        <FormField label="New recovery code" htmlFor="acc-newrec">
          <TextInput id="acc-newrec" value={newRec} onChange={(e) => setNewRec(e.target.value)} />
        </FormField>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" onClick={changeRecovery} disabled={!recPw || !newRec}>
          Update recovery code
        </Button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ *
 * Excel import / export
 * ------------------------------------------------------------------ */

function ImportExportCard() {
  const [importOpen, setImportOpen] = useState(false);
  const [importLoaded, setImportLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openImport = () => {
    setImportLoaded(true);
    setImportOpen(true);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const [{ exportConsultationsToXlsx }, companies, consultingSessions] = await Promise.all([
        import('@/utils/consultationIO'),
        sheets.read<Company>(SHEET_NAMES.companies),
        sheets.read<ConsultingSession>(SHEET_NAMES.consultingSessions),
      ]);
      exportConsultationsToXlsx(companies, consultingSessions);
      toast.success('Excel workbook downloaded');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export to Excel'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <SectionCard
      icon={FileSpreadsheet}
      title="Import & export (Excel)"
      description="Bulk-add consultations from a spreadsheet, or download them as Excel."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Import consultations</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload an Excel/CSV file, paste rows, or pull from a Google Sheets link.
          </p>
        </div>
        <Button onClick={openImport}>
          <Upload className="h-4 w-4" />
          Import from Excel
        </Button>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Export consultations</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Download every consultation as an .xlsx workbook (one row per session).
          </p>
        </div>
        <Button variant="secondary" onClick={exportExcel} loading={exporting}>
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {importLoaded && (
        <Suspense fallback={null}>
          <BulkImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ *
 * App preferences
 * ------------------------------------------------------------------ */

function PreferencesCard() {
  const { preference, setPreference } = useTheme();
  const [interval, setInterval] = useState<FollowUpIntervalPref>(() => getFollowUpIntervalPref());
  const [timezone, setTimezone] = useState(() => getTimezonePref());
  const timezones = listTimezones();

  const onIntervalChange = (value: string) => {
    const next = value as FollowUpIntervalPref;
    setInterval(next);
    setFollowUpIntervalPref(next);
    toast.success('Default follow-up interval saved');
  };

  const onTimezoneChange = (value: string) => {
    setTimezone(value);
    setTimezonePref(value);
    toast.success('Timezone saved');
  };

  return (
    <SectionCard icon={Monitor} title="Preferences" description="Personalise how the workspace behaves.">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Default follow-up interval"
          htmlFor="followUpInterval"
          hint="Pre-selected when a new session needs a follow-up."
        >
          <SelectInput
            id="followUpInterval"
            options={INTERVAL_OPTIONS}
            value={interval}
            onChange={(e) => onIntervalChange(e.target.value)}
          />
        </FormField>

        <FormField label="Timezone" htmlFor="timezone" hint="Used when displaying dates and times.">
          <SelectInput
            id="timezone"
            options={timezones.map((tz) => ({ value: tz, label: tz }))}
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
          />
        </FormField>

        <div className="sm:col-span-2">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
          <div className="mt-1.5 inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreference(value)}
                aria-pressed={preference === value}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  preference === value
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ *
 * Data management
 * ------------------------------------------------------------------ */

function DataCard() {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const exportAll = async () => {
    setExporting(true);
    try {
      const [companies, consultingSessions, appProjects, socialCreatives, followUps] =
        await Promise.all([
          sheets.read(SHEET_NAMES.companies),
          sheets.read(SHEET_NAMES.consultingSessions),
          sheets.read(SHEET_NAMES.appProjects),
          sheets.read(SHEET_NAMES.socialCreatives),
          sheets.read(SHEET_NAMES.followUps),
        ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        companies,
        consultingSessions,
        appProjects,
        socialCreatives,
        followUps,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mccia-export-${formatDate(new Date().toISOString(), '')
        .split(' ')
        .join('-')
        .toLowerCase()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export data'));
    } finally {
      setExporting(false);
    }
  };

  const clearCache = () => {
    qc.clear();
    toast.success('Views refreshed from your saved data.');
  };

  return (
    <SectionCard
      icon={Database}
      title="Data management"
      description="Your data is saved in this browser. Export a backup any time."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Export all data</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Download every record across all modules as a single JSON file.
          </p>
        </div>
        <Button variant="secondary" onClick={exportAll} loading={exporting}>
          <Download className="h-4 w-4" />
          Export all data
        </Button>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Refresh views</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reload every view from your saved data. This does not delete any records.
          </p>
        </div>
        <Button variant="secondary" onClick={clearCache}>
          <Trash2 className="h-4 w-4" />
          Refresh views
        </Button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ *
 * Shared section shell
 * ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}
