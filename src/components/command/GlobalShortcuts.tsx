import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useAppCommand } from './useAppCommand';

/** True when focus is in a text field, so single-key shortcuts shouldn't fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * App-wide keyboard shortcuts (rendered once inside the shell):
 *   ⌘K / Ctrl+K or `/`  → open the command palette / search
 *   N                    → run the current page's "new entry" action
 *   D                    → go to the dashboard
 *
 * Single-letter shortcuts are ignored while typing or when the palette is open.
 */
export function GlobalShortcuts() {
  const { openPalette, paletteOpen, newAction } = useAppCommand();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K / Ctrl+K works even while typing.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (paletteOpen || isTypingTarget(event.target)) return;

      if (event.key === '/') {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        navigate(ROUTES.dashboard);
        return;
      }
      if (event.key.toLowerCase() === 'n' && newAction) {
        event.preventDefault();
        newAction.run();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPalette, paletteOpen, newAction, navigate]);

  return null;
}
