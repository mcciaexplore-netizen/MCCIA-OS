import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky footer area (e.g. form action buttons). */
  footer?: ReactNode;
}

/**
 * Right-anchored slide-over drawer (not a modal dialog box). Handles enter/exit
 * transitions, Escape to close, overlay click to close, and body scroll lock.
 * Rendered through a portal so it escapes any transformed/overflow parents.
 */
export function SlideOver({ open, onClose, title, description, children, footer }: SlideOverProps) {
  // `render` keeps the node mounted through the exit animation; `show` drives it.
  const [render, setRender] = useState(open);
  const [show, setShow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
    const timer = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!render) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [render, onClose]);

  useEffect(() => {
    if (show) panelRef.current?.focus();
  }, [show]);

  if (!render) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-900/50 transition-opacity duration-200',
          show ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl outline-none transition-transform duration-200 ease-out dark:bg-slate-900',
          show ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
