import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CONTROL_BASE, controlBorder } from './control';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/** A searchable single-select dropdown (combobox). Controlled value/onChange. */
export function Combobox({
  options,
  value,
  onChange,
  id,
  placeholder = 'Select…',
  emptyText = 'No matches',
  invalid,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

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

  const needle = query.trim().toLowerCase();
  const filtered =
    needle === ''
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(needle) ||
            (o.sublabel ?? '').toLowerCase().includes(needle)
        );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_BASE,
          controlBorder(invalid),
          'flex items-center justify-between gap-2 text-left'
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyText}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                      option.value === value && 'bg-brand-50 dark:bg-brand-900/20'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-slate-900 dark:text-slate-100">
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span className="block truncate text-xs text-slate-400">
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                    {option.value === value && (
                      <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
