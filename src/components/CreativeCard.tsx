import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PlatformBadge } from '@/components/social/PlatformBadge';
import { CreativeStatusBadge } from '@/components/social/CreativeStatusBadge';
import { PLATFORM_CONFIG } from '@/constants/platforms';
import { useDeleteSocialCreative, useUpdateSocialCreative } from '@/hooks/useSocialCreatives';
import type { Company, SocialCreative } from '@/types';
import { cn } from '@/utils/cn';

interface CreativeCardProps {
  creative: SocialCreative;
  company: Company | null;
  onEdit: () => void;
}

export function CreativeCard({ creative, company, onEdit }: CreativeCardProps) {
  const updateCreative = useUpdateSocialCreative();
  const deleteCreative = useDeleteSocialCreative();

  const platform = PLATFORM_CONFIG[creative.platform];
  const PlatformIcon = platform.icon;
  const statusDate =
    creative.status === 'posted'
      ? creative.scheduledFor ?? creative.updatedAt
      : creative.scheduledFor;

  const markPosted = () => updateCreative.mutate({ id: creative.id, fields: { status: 'posted' } });
  const remove = () => deleteCreative.mutate(creative.id);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
        {creative.imageUrl ? (
          <img src={creative.imageUrl} alt={creative.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlatformIcon className="h-10 w-10 opacity-30" style={{ color: platform.color }} aria-hidden />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <CardMenu
            canMarkPosted={creative.status !== 'posted'}
            onEdit={onEdit}
            onMarkPosted={markPosted}
            onDelete={remove}
            deleting={deleteCreative.isPending}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={creative.platform} />
          <CreativeStatusBadge status={creative.status} date={statusDate} />
        </div>

        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{creative.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {company?.name ?? 'Unknown company'}
        </p>

        {creative.caption && (
          <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{creative.caption}</p>
        )}
      </div>
    </Card>
  );
}

interface CardMenuProps {
  canMarkPosted: boolean;
  onEdit: () => void;
  onMarkPosted: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function CardMenu({ canMarkPosted, onEdit, onMarkPosted, onDelete, deleting }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setConfirmingDelete(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Creative actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur transition-colors hover:bg-slate-900/80"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="text-sm text-slate-700 dark:text-slate-200">Delete this creative?</p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    onDelete();
                    close();
                  }}
                  className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <MenuItem
                icon={Pencil}
                label="Edit"
                onClick={() => {
                  onEdit();
                  close();
                }}
              />
              {canMarkPosted && (
                <MenuItem
                  icon={CheckCircle2}
                  label="Mark as Posted"
                  onClick={() => {
                    onMarkPosted();
                    close();
                  }}
                />
              )}
              <MenuItem
                icon={Trash2}
                label="Delete"
                destructive
                onClick={() => setConfirmingDelete(true)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        destructive
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
